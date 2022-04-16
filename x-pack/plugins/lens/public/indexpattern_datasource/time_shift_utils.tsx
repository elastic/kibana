/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import React from 'react';
import { uniq } from 'lodash';
import { FormattedMessage } from '@kbn/i18n-react';
import { Datatable } from '@kbn/expressions-plugin';
import { search } from '@kbn/data-plugin/public';
import { parseTimeShift } from '@kbn/data-plugin/common';
import {
  IndexPattern,
  GenericIndexPatternColumn,
  IndexPatternLayer,
  IndexPatternPrivateState,
} from './types';
import { FramePublicAPI } from '../types';

export const timeShiftOptions = [
  {
    label: i18n.translate('xpack.lens.indexPattern.timeShift.hour', {
      defaultMessage: '1 hour ago (1h)',
    }),
    value: '1h',
  },
  {
    label: i18n.translate('xpack.lens.indexPattern.timeShift.3hours', {
      defaultMessage: '3 hours ago (3h)',
    }),
    value: '3h',
  },
  {
    label: i18n.translate('xpack.lens.indexPattern.timeShift.6hours', {
      defaultMessage: '6 hours ago (6h)',
    }),
    value: '6h',
  },
  {
    label: i18n.translate('xpack.lens.indexPattern.timeShift.12hours', {
      defaultMessage: '12 hours ago (12h)',
    }),
    value: '12h',
  },
  {
    label: i18n.translate('xpack.lens.indexPattern.timeShift.day', {
      defaultMessage: '1 day ago (1d)',
    }),
    value: '1d',
  },
  {
    label: i18n.translate('xpack.lens.indexPattern.timeShift.week', {
      defaultMessage: '1 week ago (1w)',
    }),
    value: '1w',
  },
  {
    label: i18n.translate('xpack.lens.indexPattern.timeShift.month', {
      defaultMessage: '1 month ago (1M)',
    }),
    value: '1M',
  },
  {
    label: i18n.translate('xpack.lens.indexPattern.timeShift.3months', {
      defaultMessage: '3 months ago (3M)',
    }),
    value: '3M',
  },
  {
    label: i18n.translate('xpack.lens.indexPattern.timeShift.6months', {
      defaultMessage: '6 months ago (6M)',
    }),
    value: '6M',
  },
  {
    label: i18n.translate('xpack.lens.indexPattern.timeShift.year', {
      defaultMessage: '1 year ago (1y)',
    }),
    value: '1y',
  },
  {
    label: i18n.translate('xpack.lens.indexPattern.timeShift.previous', {
      defaultMessage: 'Previous time range',
    }),
    value: 'previous',
  },
];

export const timeShiftOptionOrder = timeShiftOptions.reduce<{ [key: string]: number }>(
  (optionMap, { value }, index) => ({
    ...optionMap,
    [value]: index,
  }),
  {}
);

export function getDateHistogramInterval(
  layer: IndexPatternLayer,
  indexPattern: IndexPattern,
  activeData: Record<string, Datatable> | undefined,
  layerId: string
) {
  const dateHistogramColumn = layer.columnOrder.find(
    (colId) => layer.columns[colId].operationType === 'date_histogram'
  );
  if (!dateHistogramColumn && !indexPattern.timeFieldName) {
    return { canShift: false, hasDateHistogram: false };
  }
  if (dateHistogramColumn && activeData && activeData[layerId] && activeData[layerId]) {
    const column = activeData[layerId].columns.find((col) => col.id === dateHistogramColumn);
    if (column) {
      const expression =
        search.aggs.getDateHistogramMetaDataByDatatableColumn(column)?.interval || '';
      return {
        interval: search.aggs.parseInterval(expression),
        expression,
        canShift: true,
        hasDateHistogram: true,
      };
    }
  }
  return { canShift: true, hasDateHistogram: Boolean(dateHistogramColumn) };
}

export function getLayerTimeShiftChecks({
  interval: dateHistogramInterval,
  hasDateHistogram,
  canShift,
}: ReturnType<typeof getDateHistogramInterval>) {
  return {
    canShift,
    isValueTooSmall: (parsedValue: ReturnType<typeof parseTimeShift>) => {
      return (
        dateHistogramInterval &&
        parsedValue &&
        typeof parsedValue === 'object' &&
        parsedValue.asMilliseconds() < dateHistogramInterval.asMilliseconds()
      );
    },
    isValueNotMultiple: (parsedValue: ReturnType<typeof parseTimeShift>) => {
      return (
        dateHistogramInterval &&
        parsedValue &&
        typeof parsedValue === 'object' &&
        !Number.isInteger(parsedValue.asMilliseconds() / dateHistogramInterval.asMilliseconds())
      );
    },
    isInvalid: (parsedValue: ReturnType<typeof parseTimeShift>) => {
      return Boolean(
        parsedValue === 'invalid' || (hasDateHistogram && parsedValue && parsedValue === 'previous')
      );
    },
  };
}

export function getDisallowedPreviousShiftMessage(
  layer: IndexPatternLayer,
  columnId: string
): string[] | undefined {
  const currentColumn = layer.columns[columnId];
  const hasPreviousShift =
    currentColumn.timeShift && parseTimeShift(currentColumn.timeShift) === 'previous';
  if (!hasPreviousShift) {
    return;
  }
  const hasDateHistogram = Object.values(layer.columns).some(
    (column) => column.operationType === 'date_histogram'
  );
  if (!hasDateHistogram) {
    return;
  }
  return [
    i18n.translate('xpack.lens.indexPattern.dateHistogramTimeShift', {
      defaultMessage:
        'In a single layer, you are unable to combine previous time range shift with date histograms. Either use an explicit time shift duration in "{column}" or replace the date histogram.',
      values: {
        column: currentColumn.label,
      },
    }),
  ];
}

export function getStateTimeShiftWarningMessages(
  state: IndexPatternPrivateState,
  { activeData }: FramePublicAPI
) {
  if (!state) return;
  const warningMessages: React.ReactNode[] = [];
  Object.entries(state.layers).forEach(([layerId, layer]) => {
    const layerIndexPattern = state.indexPatterns[layer.indexPatternId];
    if (!layerIndexPattern) {
      return;
    }
    const dateHistogramInterval = getDateHistogramInterval(
      layer,
      layerIndexPattern,
      activeData,
      layerId
    );
    if (!dateHistogramInterval.interval) {
      return;
    }
    const dateHistogramIntervalExpression = dateHistogramInterval.expression;
    const shiftInterval = dateHistogramInterval.interval.asMilliseconds();
    let timeShifts: number[] = [];
    const timeShiftMap: Record<number, string[]> = {};
    Object.entries(layer.columns).forEach(([columnId, column]) => {
      if (column.isBucketed) return;
      let duration: number = 0;
      if (column.timeShift) {
        const parsedTimeShift = parseTimeShift(column.timeShift);
        if (parsedTimeShift === 'previous' || parsedTimeShift === 'invalid') {
          return;
        }
        duration = parsedTimeShift.asMilliseconds();
      }
      timeShifts.push(duration);
      if (!timeShiftMap[duration]) {
        timeShiftMap[duration] = [];
      }
      timeShiftMap[duration].push(columnId);
    });
    timeShifts = uniq(timeShifts);

    if (timeShifts.length < 2) {
      return;
    }

    timeShifts.forEach((timeShift) => {
      if (timeShift === 0) return;
      if (timeShift < shiftInterval) {
        timeShiftMap[timeShift].forEach((columnId) => {
          warningMessages.push(
            <FormattedMessage
              key={`small-${columnId}`}
              id="xpack.lens.indexPattern.timeShiftSmallWarning"
              defaultMessage="{label} uses a time shift of {columnTimeShift} which is smaller than the date histogram interval of {interval}. To prevent mismatched data, use a multiple of {interval} as time shift."
              values={{
                label: <strong>{layer.columns[columnId].label}</strong>,
                interval: <strong>{dateHistogramIntervalExpression}</strong>,
                columnTimeShift: <strong>{layer.columns[columnId].timeShift}</strong>,
              }}
            />
          );
        });
      } else if (!Number.isInteger(timeShift / shiftInterval)) {
        timeShiftMap[timeShift].forEach((columnId) => {
          warningMessages.push(
            <FormattedMessage
              key={`multiple-${columnId}`}
              id="xpack.lens.indexPattern.timeShiftMultipleWarning"
              defaultMessage="{label} uses a time shift of {columnTimeShift} which is not a multiple of the date histogram interval of {interval}. To prevent mismatched data, use a multiple of {interval} as time shift."
              values={{
                label: <strong>{layer.columns[columnId].label}</strong>,
                interval: <strong>{dateHistogramIntervalExpression}</strong>,
                columnTimeShift: <strong>{layer.columns[columnId].timeShift!}</strong>,
              }}
            />
          );
        });
      }
    });
  });
  return warningMessages;
}

export function getColumnTimeShiftWarnings(
  dateHistogramInterval: ReturnType<typeof getDateHistogramInterval>,
  column: GenericIndexPatternColumn
) {
  const { isValueTooSmall, isValueNotMultiple } = getLayerTimeShiftChecks(dateHistogramInterval);

  const warnings: string[] = [];

  const parsedLocalValue = column.timeShift && parseTimeShift(column.timeShift);
  const localValueTooSmall = parsedLocalValue && isValueTooSmall(parsedLocalValue);
  const localValueNotMultiple = parsedLocalValue && isValueNotMultiple(parsedLocalValue);
  if (localValueTooSmall) {
    warnings.push(
      i18n.translate('xpack.lens.indexPattern.timeShift.tooSmallHelp', {
        defaultMessage:
          'Time shift should to be larger than the date histogram interval. Either increase time shift or specify smaller interval in date histogram',
      })
    );
  } else if (localValueNotMultiple) {
    warnings.push(
      i18n.translate('xpack.lens.indexPattern.timeShift.noMultipleHelp', {
        defaultMessage:
          'Time shift should be a multiple of the date histogram interval. Either adjust time shift or date histogram interval',
      })
    );
  }
  return warnings;
}
