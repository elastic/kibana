/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import moment from 'moment';
import { calcAutoIntervalNear, getAbsoluteTimeRange, UI_SETTINGS } from '@kbn/data-plugin/common';
import { partition } from 'lodash';
import {
  buildExpressionFunction,
  buildExpression,
  ExpressionFunctionDefinitions,
  ExpressionFunctionDefinition,
} from '@kbn/expressions-plugin/common';
import { TimeRange } from '@kbn/es-query';
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

const timeRangeHelp = i18n.translate('lens.formula.timeRange.help', {
  defaultMessage: 'The specified time range, in milliseconds (ms).',
});

export type ExpressionFunctionFormulaTimeRange = ExpressionFunctionDefinition<
  'formula_time_range',
  undefined,
  object,
  number
>;

const getTimeRangeAsNumber = (timeRange: TimeRange | undefined, now: number) => {
  if (!timeRange) return 0;
  const absoluteTimeRange = getAbsoluteTimeRange(timeRange, { forceNow: new Date(now) });
  return timeRange ? moment(absoluteTimeRange.to).diff(moment(absoluteTimeRange.from)) : 0;
};

export const formulaTimeRangeFn: ExpressionFunctionFormulaTimeRange = {
  name: 'formula_time_range',

  help: timeRangeHelp,

  args: {},

  fn(_input, _args, { getSearchContext }) {
    // TODO: decide whether "now" can be undefined
    const { timeRange, now } = getSearchContext() as { timeRange: TimeRange; now: number };
    return getTimeRangeAsNumber(timeRange, now);
  },
};

function getTimeRangeErrorMessages(
  _layer: FormBasedLayer,
  _columnId: string,
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
  description: timeRangeHelp,
  getExpressionFunction: (_context: ContextValues) =>
    buildExpressionFunction<ExpressionFunctionFormulaTimeRange>('formula_time_range', {}),
  getErrorMessage: getTimeRangeErrorMessages,
});

const nowHelp = i18n.translate('lens.formula.now.help', {
  defaultMessage: 'The current now moment used in Kibana expressed in milliseconds (ms).',
});

export type ExpressionFunctionFormulaNow = ExpressionFunctionDefinition<
  'formula_now',
  undefined,
  object,
  number
>;

export const formulaNowFn: ExpressionFunctionFormulaNow = {
  name: 'formula_now',

  help: nowHelp,

  args: {},

  fn(_input, _args, { getSearchContext }) {
    return getSearchContext().now as number;
  },
};

export interface NowIndexPatternColumn extends ReferenceBasedIndexPatternColumn {
  operationType: 'now';
}

function getNowErrorMessage() {
  return undefined;
}

export const nowOperation = createContextValueBasedOperation<NowIndexPatternColumn>({
  type: 'now',
  label: 'Current now',
  description: nowHelp,
  getExpressionFunction: (_context: ContextValues) =>
    buildExpressionFunction<ExpressionFunctionFormulaNow>('formula_now', {}),
  getErrorMessage: getNowErrorMessage,
});

const intervalHelp = i18n.translate('lens.formula.interval.help', {
  defaultMessage: 'The specified minimum interval for the date histogram, in milliseconds (ms).',
});

export type ExpressionFunctionFormulaInterval = ExpressionFunctionDefinition<
  'formula_interval',
  undefined,
  {
    targetBars?: number;
  },
  number
>;

export const formulaIntervalFn: ExpressionFunctionFormulaInterval = {
  name: 'formula_interval',

  help: intervalHelp,

  args: {
    targetBars: {
      types: ['number'],
      help: i18n.translate('lens.formula.interval.targetBars.help', {
        defaultMessage: 'The target number of bars for the date histogram.',
      }),
    },
  },

  fn(_input, args, { getSearchContext }) {
    const { timeRange, now } = getSearchContext() as { timeRange: TimeRange; now: number };
    return timeRange && args.targetBars
      ? calcAutoIntervalNear(
          args.targetBars,
          getTimeRangeAsNumber(timeRange as TimeRange, now as number)
        ).asMilliseconds()
      : 0;
  },
};

export interface IntervalIndexPatternColumn extends ReferenceBasedIndexPatternColumn {
  operationType: 'interval';
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
  description: intervalHelp,
  getExpressionFunction: ({ targetBars }: ContextValues) =>
    buildExpressionFunction<ExpressionFunctionFormulaInterval>('formula_interval', {
      targetBars,
    }),
  getErrorMessage: getIntervalErrorMessages,
});

export type ConstantsIndexPatternColumn =
  | IntervalIndexPatternColumn
  | TimeRangeIndexPatternColumn
  | NowIndexPatternColumn;

function createContextValueBasedOperation<ColumnType extends ConstantsIndexPatternColumn>({
  label,
  type,
  getExpressionFunction,
  getErrorMessage,
  description,
}: {
  label: string;
  type: ColumnType['operationType'];
  description: string;
  getExpressionFunction: (context: ContextValues) => ReturnType<typeof buildExpressionFunction>;
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
        buildExpressionFunction<ExpressionFunctionDefinitions['math_column']>('mathColumn', {
          id: columnId,
          name: column.label,
          expression: buildExpression([getExpressionFunction(context)]),
        }).toAst(),
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
