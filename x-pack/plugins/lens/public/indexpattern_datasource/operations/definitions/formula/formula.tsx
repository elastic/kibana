/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { BaseIndexPatternColumn, OperationDefinition } from '..';
import type { ReferenceBasedIndexPatternColumn } from '../column_types';
import type { IndexPattern } from '../../../types';
import { runASTValidation, tryToParse } from './validation';
import { WrappedFormulaEditor } from './editor';
import { insertOrReplaceFormulaColumn } from './parse';
import { generateFormula } from './generate';
import { filterByVisibleOperation } from './util';
import { getManagedColumnsFrom } from '../../layer_helpers';
import { getFilter, isColumnFormatted } from '../helpers';

const defaultLabel = i18n.translate('xpack.lens.indexPattern.formulaLabel', {
  defaultMessage: 'Formula',
});

export interface FormulaIndexPatternColumn extends ReferenceBasedIndexPatternColumn {
  operationType: 'formula';
  params: {
    formula?: string;
    isFormulaBroken?: boolean;
    // last value on numeric fields can be formatted
    format?: {
      id: string;
      params?: {
        decimals: number;
      };
    };
  };
}

export function isFormulaIndexPatternColumn(
  column: BaseIndexPatternColumn
): column is FormulaIndexPatternColumn {
  return 'params' in column && 'formula' in (column as FormulaIndexPatternColumn).params;
}

export const formulaOperation: OperationDefinition<FormulaIndexPatternColumn, 'managedReference'> =
  {
    type: 'formula',
    displayName: defaultLabel,
    getDefaultLabel: (column, indexPattern) => column.params.formula ?? defaultLabel,
    input: 'managedReference',
    hidden: true,
    filterable: {
      helpMessage: i18n.translate('xpack.lens.indexPattern.formulaFilterableHelpText', {
        defaultMessage: 'The provided filter will be applied to the entire formula.',
      }),
    },
    getDisabledStatus(indexPattern: IndexPattern) {
      return undefined;
    },
    getErrorMessage(layer, columnId, indexPattern, operationDefinitionMap) {
      const column = layer.columns[columnId] as FormulaIndexPatternColumn;
      if (!column.params.formula || !operationDefinitionMap) {
        return;
      }

      const visibleOperationsMap = filterByVisibleOperation(operationDefinitionMap);
      const { root, error } = tryToParse(column.params.formula, visibleOperationsMap);
      if (error || root == null) {
        return error?.message ? [error.message] : [];
      }

      const errors = runASTValidation(root, layer, indexPattern, visibleOperationsMap, column);

      if (errors.length) {
        return errors.map(({ message }) => message);
      }

      const managedColumns = getManagedColumnsFrom(columnId, layer.columns);
      const innerErrors = managedColumns
        .flatMap(([id, col]) => {
          const def = visibleOperationsMap[col.operationType];
          if (def?.getErrorMessage) {
            const messages = def.getErrorMessage(layer, id, indexPattern, visibleOperationsMap);
            return messages ? { message: messages.join(', ') } : [];
          }
          return [];
        })
        .filter((marker) => marker);
      const hasBuckets = layer.columnOrder.some((colId) => layer.columns[colId].isBucketed);
      const hasOtherMetrics = layer.columnOrder.some((colId) => {
        const col = layer.columns[colId];
        return (
          !col.isBucketed &&
          !col.isStaticValue &&
          col.operationType !== 'math' &&
          col.operationType !== 'formula'
        );
      });

      if (hasBuckets && !hasOtherMetrics) {
        innerErrors.push({
          message: i18n.translate('xpack.lens.indexPattern.noRealMetricError', {
            defaultMessage:
              'A layer with only static values will not show results, use at least one dynamic metric',
          }),
        });
      }

      return innerErrors.length ? innerErrors.map(({ message }) => message) : undefined;
    },
    getPossibleOperation() {
      return {
        dataType: 'number',
        isBucketed: false,
        scale: 'ratio',
      };
    },
    toExpression: (layer, columnId) => {
      const currentColumn = layer.columns[columnId] as FormulaIndexPatternColumn;
      const params = currentColumn.params;
      // TODO: improve this logic
      const useDisplayLabel = currentColumn.label !== defaultLabel;
      const label = !params?.isFormulaBroken
        ? useDisplayLabel
          ? currentColumn.label
          : params?.formula ?? defaultLabel
        : defaultLabel;

      return [
        {
          type: 'function',
          function: currentColumn.references.length ? 'mathColumn' : 'mapColumn',
          arguments: {
            id: [columnId],
            name: [label || defaultLabel],
            expression: [currentColumn.references.length ? `"${currentColumn.references[0]}"` : ''],
          },
        },
      ];
    },
    buildColumn({ previousColumn, layer, indexPattern }, _, operationDefinitionMap) {
      let previousFormula = '';
      if (previousColumn) {
        previousFormula = generateFormula(
          previousColumn,
          layer,
          previousFormula,
          operationDefinitionMap
        );
      }
      // carry over the format settings from previous operation for seamless transfer
      // NOTE: this works only for non-default formatters set in Lens
      let prevFormat = {};
      if (previousColumn && isColumnFormatted(previousColumn)) {
        prevFormat = { format: previousColumn.params?.format };
      }
      return {
        label: previousFormula || defaultLabel,
        dataType: 'number',
        operationType: 'formula',
        isBucketed: false,
        scale: 'ratio',
        params: previousFormula
          ? { formula: previousFormula, isFormulaBroken: false, ...prevFormat }
          : { ...prevFormat },
        references: [],
        // carry over the filter if coming from another formula,
        // otherwise the filter has been already migrated into the formula text
        filter:
          previousColumn?.operationType === 'formula' ? getFilter(previousColumn, {}) : undefined,
        timeScale: previousColumn?.timeScale,
      };
    },
    isTransferable: () => {
      return true;
    },
    createCopy(layer, sourceId, targetId, indexPattern, operationDefinitionMap) {
      const currentColumn = layer.columns[sourceId] as FormulaIndexPatternColumn;

      return insertOrReplaceFormulaColumn(targetId, currentColumn, layer, {
        indexPattern,
        operations: operationDefinitionMap,
      }).layer;
    },
    timeScalingMode: 'optional',
    paramEditor: WrappedFormulaEditor,
  };
