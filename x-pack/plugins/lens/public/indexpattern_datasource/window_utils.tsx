/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { GenericIndexPatternColumn } from './indexpattern';
import { getDateHistogramInterval } from './time_shift_utils';
import { IndexPattern } from './types';

export const windowOptions = [
  {
    label: i18n.translate('xpack.lens.indexPattern.window.30s', {
      defaultMessage: '30 seconds (30s)',
    }),
    value: '30s',
  },
  {
    label: i18n.translate('xpack.lens.indexPattern.window.1m', {
      defaultMessage: '1 minute (1m)',
    }),
    value: '1m',
  },
  {
    label: i18n.translate('xpack.lens.indexPattern.window.5m', {
      defaultMessage: '5 minutes (5m)',
    }),
    value: '5m',
  },
  {
    label: i18n.translate('xpack.lens.indexPattern.window.15m', {
      defaultMessage: '15 minutes (15m)',
    }),
    value: '15m',
  },
  {
    label: i18n.translate('xpack.lens.indexPattern.window.1h', {
      defaultMessage: '1 hour (1h)',
    }),
    value: '1h',
  },
];

export const windowOptionOrder = windowOptions.reduce<{ [key: string]: number }>(
  (optionMap, { value }, index) => ({
    ...optionMap,
    [value]: index,
  }),
  {}
);

export function getColumnWindowWarnings(
  dateHistogramInterval: ReturnType<typeof getDateHistogramInterval>,
  column: GenericIndexPatternColumn,
  indexPattern: IndexPattern
) {
  const warnings: string[] = [];

  if ((dateHistogramInterval.hasDateHistogram || !indexPattern.timeFieldName) && column.window) {
    warnings.push(
      i18n.translate('xpack.lens.indexPattern.window.notApplicableHelp', {
        defaultMessage:
          'Reduced time range can only be used without a date histogram and with a specified default time field on the data view. Otherwise it is ignored',
      })
    );
  }
  return warnings;
}
