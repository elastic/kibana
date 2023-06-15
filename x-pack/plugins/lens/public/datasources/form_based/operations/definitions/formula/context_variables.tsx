/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import moment from 'moment';
import { calcAutoIntervalNear, UI_SETTINGS } from '@kbn/data-plugin/common';
import { partition } from 'lodash';
import type {
  DateHistogramIndexPatternColumn,
  FormBasedLayer,
  GenericIndexPatternColumn,
} from '../../../../..';
import type { DateRange } from '../../../../../../common/types';
import type { GenericOperationDefinition, OperationDefinition } from '..';
import type { ReferenceBasedIndexPatternColumn } from '../column_types';
import { IndexPattern } from '../../../../../types';

// copied over from layer_helpers
// TODO: split layer_helpers util into pure/non-pure functions to avoid issues with tests
export function getColumnOrder(layer: FormBasedLayer): string[] {
  const entries = Object.entries(layer.columns);
  entries.sort(([idA], [idB]) => {
    const indexA = layer.columnOrder.indexOf(idA);
    const indexB = layer.columnOrder.indexOf(idB);
    if (indexA > -1 && indexB > -1) {
      return indexA - indexB;
    } else if (indexA > -1) {
      return -1;
    } else {
      return 1;
    }
  });

  const [aggregations, metrics] = partition(entries, ([, col]) => col.isBucketed);

  return aggregations.map(([id]) => id).concat(metrics.map(([id]) => id));
}

// Copied over from helpers
export function isColumnOfType<C extends GenericIndexPatternColumn>(
  type: C['operationType'],
  column: GenericIndexPatternColumn
): column is C {
  return column.operationType === type;
}

export interface ContextValues {
  dateRange?: DateRange;
  now?: Date;
  targetBars?: number;
}

export interface TimeRangeIndexPatternColumn extends ReferenceBasedIndexPatternColumn {
  operationType: 'time_range';
}

function getTimeRangeFromContext({ dateRange }: ContextValues) {
  return dateRange ? moment(dateRange.toDate).diff(moment(dateRange.fromDate)) : 0;
}

function getTimeRangeErrorMessages(
  layer: FormBasedLayer,
  columnId: string,
  indexPattern: IndexPattern,
  dateRange?: DateRange | undefined
) {
  const errors = [];
  if (!indexPattern.timeFieldName) {
    errors.push(
      i18n.translate('xpack.lens.indexPattern.dateRange.dataViewNoTimeBased', {
        defaultMessage: 'The current dataView is not time based',
      })
    );
  }
  if (!dateRange) {
    errors.push(
      i18n.translate('xpack.lens.indexPattern.dateRange.noTimeRange', {
        defaultMessage: 'The current time range interval is not available',
      })
    );
  }
  return errors.length ? errors : undefined;
}

export const timeRangeOperation = createContextValueBasedOperation<TimeRangeIndexPatternColumn>({
  type: 'time_range',
  label: 'Time range',
  description: i18n.translate('xpack.lens.indexPattern.timeRange.documentation.markdown', {
    defaultMessage: `
The specified time range, in milliseconds (ms).
    `,
  }),
  getContextValue: getTimeRangeFromContext,
  getErrorMessage: getTimeRangeErrorMessages,
});

export interface NowIndexPatternColumn extends ReferenceBasedIndexPatternColumn {
  operationType: 'now';
}

function getNowFromContext({ now }: ContextValues) {
  return now == null ? Date.now() : +now;
}
function getNowErrorMessage() {
  return undefined;
}

export const nowOperation = createContextValueBasedOperation<NowIndexPatternColumn>({
  type: 'now',
  label: 'Current now',
  description: i18n.translate('xpack.lens.indexPattern.now.documentation.markdown', {
    defaultMessage: `
  The current now moment used in Kibana expressed in milliseconds (ms).
      `,
  }),
  getContextValue: getNowFromContext,
  getErrorMessage: getNowErrorMessage,
});

export interface IntervalIndexPatternColumn extends ReferenceBasedIndexPatternColumn {
  operationType: 'interval';
}

function getIntervalFromContext(context: ContextValues) {
  return context.dateRange && context.targetBars
    ? calcAutoIntervalNear(context.targetBars, getTimeRangeFromContext(context)).asMilliseconds()
    : 0;
}

function getIntervalErrorMessages(
  layer: FormBasedLayer,
  columnId: string,
  indexPattern: IndexPattern,
  dateRange?: DateRange | undefined,
  operationDefinitionMap?: Record<string, GenericOperationDefinition> | undefined,
  targetBars?: number
) {
  const errors = [];
  if (!targetBars) {
    errors.push(
      i18n.translate('xpack.lens.indexPattern.interval.noTargetBars', {
        defaultMessage: `Missing "{uiSettingVar}" value`,
        values: {
          uiSettingVar: UI_SETTINGS.HISTOGRAM_BAR_TARGET,
        },
      })
    );
  }
  if (!dateRange) {
    errors.push(
      i18n.translate('xpack.lens.indexPattern.interval.noTimeRange', {
        defaultMessage: 'The current time range interval is not available',
      })
    );
  }
  if (
    !Object.values(layer.columns).some((column) =>
      isColumnOfType<DateHistogramIndexPatternColumn>('date_histogram', column)
    )
  ) {
    errors.push(
      i18n.translate('xpack.lens.indexPattern.interval.noDateHistogramColumn', {
        defaultMessage: 'Cannot compute an interval without a date histogram column configured',
      })
    );
  }
  return errors.length ? errors : undefined;
}

export const intervalOperation = createContextValueBasedOperation<IntervalIndexPatternColumn>({
  type: 'interval',
  label: 'Date histogram interval',
  description: i18n.translate('xpack.lens.indexPattern.interval.documentation.markdown', {
    defaultMessage: `
The specified minimum interval for the date histogram, in milliseconds (ms).
      `,
  }),
  getContextValue: getIntervalFromContext,
  getErrorMessage: getIntervalErrorMessages,
});

export type ConstantsIndexPatternColumn =
  | IntervalIndexPatternColumn
  | TimeRangeIndexPatternColumn
  | NowIndexPatternColumn;

function createContextValueBasedOperation<ColumnType extends ConstantsIndexPatternColumn>({
  label,
  type,
  getContextValue,
  getErrorMessage,
  description,
}: {
  label: string;
  type: ColumnType['operationType'];
  description: string;
  getContextValue: (context: ContextValues) => number;
  getErrorMessage: OperationDefinition<ColumnType, 'managedReference'>['getErrorMessage'];
}): OperationDefinition<ColumnType, 'managedReference'> {
  return {
    type,
    displayName: label,
    input: 'managedReference',
    selectionStyle: 'hidden',
    usedInMath: true,
    getDefaultLabel: () => label,
    isTransferable: () => true,
    getDisabledStatus() {
      return undefined;
    },
    getErrorMessage,
    getPossibleOperation() {
      return {
        dataType: 'number',
        isBucketed: false,
        scale: 'ratio',
      };
    },
    buildColumn: () => {
      return {
        label,
        dataType: 'number',
        operationType: type,
        isBucketed: false,
        scale: 'ratio',
        references: [],
      } as unknown as ColumnType;
    },
    toExpression: (layer, columnId, _, context = {}) => {
      const column = layer.columns[columnId] as ColumnType;
      return [
        {
          type: 'function',
          function: 'mathColumn',
          arguments: {
            id: [columnId],
            name: [column.label],
            expression: [String(getContextValue(context))],
          },
        },
      ];
    },
    createCopy(layers, source, target) {
      const currentColumn = layers[source.layerId].columns[source.columnId] as ColumnType;
      const targetLayer = layers[target.layerId];
      const columns = {
        ...targetLayer.columns,
        [target.columnId]: { ...currentColumn },
      };
      return {
        ...layers,
        [target.layerId]: {
          ...targetLayer,
          columns,
          columnOrder: getColumnOrder({ ...targetLayer, columns }),
        },
      };
    },
    documentation: {
      section: 'constants',
      signature: '',
      description,
    },
  };
}
