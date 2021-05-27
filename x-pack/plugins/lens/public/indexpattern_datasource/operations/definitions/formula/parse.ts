/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { isObject } from 'lodash';
import type { TinymathAST, TinymathVariable, TinymathLocation } from '@kbn/tinymath';
import { OperationDefinition, GenericOperationDefinition, IndexPatternColumn } from '../index';
import { IndexPattern, IndexPatternLayer } from '../../../types';
import { mathOperation } from './math';
import { documentField } from '../../../document_field';
import { runASTValidation, shouldHaveFieldArgument, tryToParse } from './validation';
import {
  filterByVisibleOperation,
  findVariables,
  getOperationParams,
  groupArgsByType,
} from './util';
import { FormulaIndexPatternColumn } from './formula';
import { getColumnOrder } from '../../layer_helpers';

function getManagedId(mainId: string, index: number) {
  return `${mainId}X${index}`;
}

function parseAndExtract(
  text: string,
  layer: IndexPatternLayer,
  columnId: string,
  indexPattern: IndexPattern,
  operationDefinitionMap: Record<string, GenericOperationDefinition>
) {
  const { root, error } = tryToParse(text, operationDefinitionMap);
  if (error || !root) {
    return { extracted: [], isValid: false };
  }
  // before extracting the data run the validation task and throw if invalid
  const errors = runASTValidation(root, layer, indexPattern, operationDefinitionMap);
  if (errors.length) {
    return { extracted: [], isValid: false };
  }
  /*
    { name: 'add', args: [ { name: 'abc', args: [5] }, 5 ] }
    */
  const extracted = extractColumns(columnId, operationDefinitionMap, root, layer, indexPattern);
  return { extracted, isValid: true };
}

function extractColumns(
  idPrefix: string,
  operations: Record<string, GenericOperationDefinition>,
  ast: TinymathAST,
  layer: IndexPatternLayer,
  indexPattern: IndexPattern
): Array<{ column: IndexPatternColumn; location?: TinymathLocation }> {
  const columns: Array<{ column: IndexPatternColumn; location?: TinymathLocation }> = [];

  function parseNode(node: TinymathAST) {
    if (typeof node === 'number' || node.type !== 'function') {
      // leaf node
      return node;
    }

    const nodeOperation = operations[node.name];
    if (!nodeOperation) {
      // it's a regular math node
      const consumedArgs = node.args
        .map(parseNode)
        .filter((n) => typeof n !== 'undefined' && n !== null) as Array<number | TinymathVariable>;
      return {
        ...node,
        args: consumedArgs,
      };
    }

    // split the args into types for better TS experience
    const { namedArguments, variables, functions } = groupArgsByType(node.args);

    // operation node
    if (nodeOperation.input === 'field') {
      const [fieldName] = variables.filter((v): v is TinymathVariable => isObject(v));
      // a validation task passed before executing this and checked already there's a field
      const field = shouldHaveFieldArgument(node)
        ? indexPattern.getFieldByName(fieldName.value)!
        : documentField;

      const mappedParams = getOperationParams(nodeOperation, namedArguments || []);

      const newCol = (nodeOperation as OperationDefinition<
        IndexPatternColumn,
        'field'
      >).buildColumn(
        {
          layer,
          indexPattern,
          field,
        },
        mappedParams
      );
      const newColId = getManagedId(idPrefix, columns.length);
      newCol.customLabel = true;
      newCol.label = newColId;
      columns.push({ column: newCol, location: node.location });
      // replace by new column id
      return newColId;
    }

    if (nodeOperation.input === 'fullReference') {
      const [referencedOp] = functions;
      const consumedParam = parseNode(referencedOp);

      const subNodeVariables = consumedParam ? findVariables(consumedParam) : [];
      const mathColumn = mathOperation.buildColumn({
        layer,
        indexPattern,
      });
      mathColumn.references = subNodeVariables.map(({ value }) => value);
      mathColumn.params.tinymathAst = consumedParam!;
      columns.push({ column: mathColumn });
      mathColumn.customLabel = true;
      mathColumn.label = getManagedId(idPrefix, columns.length - 1);

      const mappedParams = getOperationParams(nodeOperation, namedArguments || []);
      const newCol = (nodeOperation as OperationDefinition<
        IndexPatternColumn,
        'fullReference'
      >).buildColumn(
        {
          layer,
          indexPattern,
          referenceIds: [getManagedId(idPrefix, columns.length - 1)],
        },
        mappedParams
      );
      const newColId = getManagedId(idPrefix, columns.length);
      newCol.customLabel = true;
      newCol.label = newColId;
      columns.push({ column: newCol, location: node.location });
      // replace by new column id
      return newColId;
    }
  }
  const root = parseNode(ast);
  if (root === undefined) {
    return [];
  }
  const variables = findVariables(root);
  const mathColumn = mathOperation.buildColumn({
    layer,
    indexPattern,
  });
  mathColumn.references = variables.map(({ value }) => value);
  mathColumn.params.tinymathAst = root!;
  const newColId = getManagedId(idPrefix, columns.length);
  mathColumn.customLabel = true;
  mathColumn.label = newColId;
  columns.push({ column: mathColumn });
  return columns;
}

export function regenerateLayerFromAst(
  text: string,
  layer: IndexPatternLayer,
  columnId: string,
  currentColumn: FormulaIndexPatternColumn,
  indexPattern: IndexPattern,
  operationDefinitionMap: Record<string, GenericOperationDefinition>
) {
  const { extracted, isValid } = parseAndExtract(
    text,
    layer,
    columnId,
    indexPattern,
    filterByVisibleOperation(operationDefinitionMap)
  );

  const columns = { ...layer.columns };

  const locations: Record<string, TinymathLocation> = {};

  Object.keys(columns).forEach((k) => {
    if (k.startsWith(columnId)) {
      delete columns[k];
    }
  });

  extracted.forEach(({ column, location }, index) => {
    columns[getManagedId(columnId, index)] = column;
    if (location) locations[getManagedId(columnId, index)] = location;
  });

  columns[columnId] = {
    ...currentColumn,
    label: !currentColumn.customLabel
      ? text ??
        i18n.translate('xpack.lens.indexPattern.formulaLabel', {
          defaultMessage: 'Formula',
        })
      : currentColumn.label,
    params: {
      ...currentColumn.params,
      formula: text,
      isFormulaBroken: !isValid,
    },
    references: !isValid ? [] : [getManagedId(columnId, extracted.length - 1)],
  };

  return {
    newLayer: {
      ...layer,
      columns,
      columnOrder: getColumnOrder({
        ...layer,
        columns,
      }),
    },
    locations,
  };
}
