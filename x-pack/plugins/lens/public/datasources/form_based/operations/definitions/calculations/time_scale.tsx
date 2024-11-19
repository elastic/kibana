/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { NORMALIZE_BY_UNIT_ID, NORMALIZE_BY_UNIT_NAME } from '@kbn/lens-formula-docs';
import type {
  FormattedIndexPatternColumn,
  ReferenceBasedIndexPatternColumn,
} from '../column_types';
import { getErrorsForDateReference } from './utils';
import type { FieldBasedOperationErrorMessage, OperationDefinition } from '..';
import { getFormatFromPreviousColumn } from '../helpers';
import { FormBasedLayer } from '../../../types';

export type TimeScaleIndexPatternColumn = FormattedIndexPatternColumn &
  ReferenceBasedIndexPatternColumn & {
    operationType: typeof NORMALIZE_BY_UNIT_ID;
    params: {
      unit?: string;
    };
  };

export const timeScaleOperation: OperationDefinition<TimeScaleIndexPatternColumn, 'fullReference'> =
  {
    type: NORMALIZE_BY_UNIT_ID,
    priority: 1,
    displayName: NORMALIZE_BY_UNIT_NAME,
    input: 'fullReference',
    selectionStyle: 'hidden',
    requiredReferences: [
      {
        input: ['field', 'managedReference', 'fullReference'],
        validateMetadata: (meta) => meta.dataType === 'number' && !meta.isBucketed,
      },
    ],
    operationParams: [{ name: 'unit', type: 'string', required: true }],
    getPossibleOperation: () => {
      return {
        dataType: 'number',
        isBucketed: false,
        scale: 'ratio',
      };
    },
    getDefaultLabel: (column, columns, indexPattern) => {
      return NORMALIZE_BY_UNIT_ID;
    },
    toExpression: (layer, columnId) => {
      const currentColumn = layer.columns[columnId] as unknown as TimeScaleIndexPatternColumn;
      const buckets = layer.columnOrder.filter((colId) => layer.columns[colId].isBucketed);
      const dateColumn = buckets.find(
        (colId) => layer.columns[colId].operationType === 'date_histogram'
      );

      return [
        {
          type: 'function',
          function: 'lens_time_scale',
          arguments: {
            dateColumnId: dateColumn ? [dateColumn] : [],
            inputColumnId: [currentColumn.references[0]],
            outputColumnId: [columnId],
            outputColumnName: [currentColumn.label],
            targetUnit: [currentColumn.params.unit!],
            reducedTimeRange: currentColumn.reducedTimeRange
              ? [currentColumn.reducedTimeRange]
              : [],
          },
        },
      ];
    },
    buildColumn: ({ referenceIds, previousColumn, layer, indexPattern }, columnParams) => {
      return {
        label: NORMALIZE_BY_UNIT_NAME,
        dataType: 'number',
        operationType: NORMALIZE_BY_UNIT_ID,
        isBucketed: false,
        scale: 'ratio',
        references: referenceIds,
        params: {
          ...getFormatFromPreviousColumn(previousColumn),
          unit: columnParams?.unit,
        },
      };
    },
    isTransferable: () => {
      return true;
    },
    getErrorMessage: (layer: FormBasedLayer, columnId: string) => {
      const errors: FieldBasedOperationErrorMessage[] = getErrorsForDateReference(
        layer,
        columnId,
        NORMALIZE_BY_UNIT_NAME
      );

      if (!(layer.columns[columnId] as TimeScaleIndexPatternColumn).params.unit) {
        errors.push({
          uniqueId: '',
          message: i18n.translate('xpack.lens.indexPattern.timeScale.missingUnit', {
            defaultMessage: 'No unit specified for normalize by unit.',
          }),
        });
      }

      if (
        ['s', 'm', 'h', 'd'].indexOf(
          (layer.columns[columnId] as TimeScaleIndexPatternColumn).params.unit ?? 's'
        ) === -1
      ) {
        errors.push({
          uniqueId: '',
          message: i18n.translate('xpack.lens.indexPattern.timeScale.wrongUnit', {
            defaultMessage: 'Unknown unit specified: use s, m, h or d.',
          }),
        });
      }

      return errors;
    },

    filterable: false,
    shiftable: false,
  };
