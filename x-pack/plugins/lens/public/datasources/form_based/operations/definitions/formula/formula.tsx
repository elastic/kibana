/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { uniqBy } from 'lodash';
import { nonNullable } from '../../../../../utils';
import type {
  BaseIndexPatternColumn,
  FieldBasedOperationErrorMessage,
  OperationDefinition,
} from '..';
import type { ReferenceBasedIndexPatternColumn } from '../column_types';
import type { IndexPattern } from '../../../../../types';
import { runASTValidation, tryToParse } from './validation';
import { WrappedFormulaEditor } from './editor';
import { insertOrReplaceFormulaColumn } from './parse';
import { generateFormula } from './generate';
import { filterByVisibleOperation } from './util';
import { getManagedColumnsFrom } from '../../layer_helpers';
import { generateMissingFieldMessage, getFilter, isColumnFormatted } from '../helpers';

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
    getDefaultLabel: (column) => column.params.formula ?? defaultLabel,
    input: 'managedReference',
    hidden: true,
    filterable: {
      helpMessage: i18n.translate('xpack.lens.indexPattern.formulaFilterableHelpText', {
        defaultMessage: 'The provided filter will be applied to the entire formula.',
      }),
    },
    canReduceTimeRange: {
      helpMessage: i18n.translate('xpack.lens.indexPattern.formulaCanReduceTimeRangeHelpText', {
        defaultMessage: 'Applies to the entire formula.',
      }),
    },
    getDisabledStatus(indexPattern: IndexPattern) {
      return undefined;
    },
    getErrorMessage(layer, columnId, indexPattern, dateRange, operationDefinitionMap, targetBars) {
      const column = layer.columns[columnId] as FormulaIndexPatternColumn;
      if (!column.params.formula || !operationDefinitionMap) {
        return;
      }

      const visibleOperationsMap = filterByVisibleOperation(operationDefinitionMap);
      const { root, error } = tryToParse(column.params.formula, visibleOperationsMap);
      if (error || root == null) {
        return error?.message ? [error.message] : [];
      }

      const errors = runASTValidation(
        root,
        layer,
        indexPattern,
        visibleOperationsMap,
        column,
        dateRange
      );

      if (errors.length) {
        // remove duplicates
        return uniqBy(errors, ({ message }) => message).map(({ type, message, extraInfo }) =>
          type === 'missingField' && extraInfo?.missingFields
            ? generateMissingFieldMessage(extraInfo.missingFields, columnId)
            : message
        );
      }

      const managedColumns = getManagedColumnsFrom(columnId, layer.columns);
      const innerErrors = [
        ...managedColumns
          .flatMap(([id, col]) => {
            const def = visibleOperationsMap[col.operationType];
            if (def?.getErrorMessage) {
              // TOOD: it would be nice to have nicer column names here rather than `Part of <formula content>`
              const messages = def.getErrorMessage(
                layer,
                id,
                indexPattern,
                dateRange,
                visibleOperationsMap,
                targetBars
              );
              return messages || [];
            }
            return [];
          })
          .filter(nonNullable)
          // dedup messages with the same content
          .reduce((memo, message) => {
            memo.add(message);
            return memo;
          }, new Set<FieldBasedOperationErrorMessage>()),
      ];
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
      // What happens when it transition from an error state to a new valid state?
      // the "hasOtherMetrics" might be false as the formula hasn't had time to
      // populate all the referenced columns yet. So check if there are managedColumns
      // (if no error is present, there's at least one other math column present)
      const hasBeenEvaluated = !errors.length && managedColumns.length;

      if (hasBuckets && !hasOtherMetrics && hasBeenEvaluated) {
        innerErrors.push({
          message: i18n.translate('xpack.lens.indexPattern.noRealMetricError', {
            defaultMessage:
              'A layer with only static values will not show results, use at least one dynamic metric',
          }),
        });
      }

      return innerErrors.length ? innerErrors : undefined;
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
      const label = useDisplayLabel ? currentColumn.label : params?.formula ?? defaultLabel;

      return [
        {
          type: 'function',
          function: currentColumn.references.length ? 'mathColumn' : 'mapColumn',
          arguments: {
            id: [columnId],
            name: [label || defaultLabel],
            ...(currentColumn.references.length
              ? {
                  castColumns: [currentColumn.references[0]],
                }
              : {}),
            expression: [currentColumn.references.length ? `"${currentColumn.references[0]}"` : ''],
          },
        },
      ];
    },
    buildColumn({ previousColumn, layer, indexPattern }, columnParams, operationDefinitionMap) {
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
      let format = {};
      if (previousColumn && isColumnFormatted(previousColumn)) {
        format = { format: previousColumn.params?.format };
      }

      if (columnParams?.format) {
        format = { format: columnParams.format };
      }
      const isPreviousFormulaColumn = previousColumn?.operationType === 'formula';

      return {
        label: previousFormula || defaultLabel,
        dataType: 'number',
        operationType: 'formula',
        isBucketed: false,
        scale: 'ratio',
        params: previousFormula
          ? {
              formula: previousFormula,
              isFormulaBroken: false,
              ...format,
              ...(columnParams?.formula ? { formula: columnParams?.formula } : {}),
            }
          : { ...format, ...(columnParams?.formula ? { formula: columnParams?.formula } : {}) },
        references: [],
        // carry over the filter if coming from another formula,
        // otherwise the filter has been already migrated into the formula text
        filter: isPreviousFormulaColumn ? getFilter(previousColumn, columnParams) : undefined,
        reducedTimeRange: isPreviousFormulaColumn ? previousColumn.reducedTimeRange : undefined,
        timeScale: previousColumn?.timeScale,
      };
    },
    isTransferable: () => {
      return true;
    },
    createCopy(layers, source, target, operationDefinitionMap) {
      const currentColumn = layers[source.layerId].columns[
        source.columnId
      ] as FormulaIndexPatternColumn;
      const modifiedLayer = insertOrReplaceFormulaColumn(
        target.columnId,
        currentColumn,
        layers[target.layerId],
        {
          indexPattern: target.dataView,
          operations: operationDefinitionMap,
        }
      );
      return {
        ...layers,
        [target.layerId]: modifiedLayer.layer,
      };
    },
    timeScalingMode: 'optional',
    paramEditor: WrappedFormulaEditor,
  };
