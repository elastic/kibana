/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RollupAction } from '../../../../../../common/types';

import { InternalRollup } from './types';

import { CALENDAR_INTERVAL_OPTIONS } from './constants';

function removeEmptyValues<O extends { [key: string]: unknown }>(object: O): O {
  Object.entries(object).forEach(([key, value]) => {
    if (value == null || (typeof value === 'string' && value.trim() === '')) {
      delete object[key];
    }
  });

  return object;
}

export function serializeRollup(rollupConfig: InternalRollup): RollupAction['config'] {
  const {
    dateHistogramIntervalType,
    dateHistogramInterval,
    rollupDelay,
    dateHistogramTimeZone,
    dateHistogramField,
    metrics,
    terms,
    histogram,
    histogramInterval,
  } = rollupConfig;

  const serializedRollup: RollupAction['config'] = {
    groups: {
      date_histogram: removeEmptyValues({
        delay: rollupDelay,
        time_zone: dateHistogramTimeZone,
        field: dateHistogramField,
      }),
    },
  };

  if (dateHistogramIntervalType === 'calendar') {
    serializedRollup.groups.date_histogram.calendar_interval = dateHistogramInterval;
  } else {
    serializedRollup.groups.date_histogram.fixed_interval = dateHistogramInterval;
  }

  if (terms.length) {
    serializedRollup.groups.terms = {
      fields: terms.map(({ name }) => name),
    };
  }

  if (histogram.length) {
    serializedRollup.groups.histogram = {
      interval: histogramInterval,
      fields: histogram.map(({ name }) => name),
    };
  }

  if (metrics.length) {
    serializedRollup.metrics = [];
    metrics.forEach(({ name, types }) => {
      // Exclude any metrics which have been selected but not configured with any types.
      if (types.length) {
        serializedRollup.metrics!.push({
          field: name,
          metrics: types,
        });
      }
    });
  }

  return serializedRollup;
}

export function deserializeRollup(rollupAction: RollupAction['config']): InternalRollup {
  const {
    metrics,
    groups: {
      date_histogram: {
        interval,
        fixed_interval: fixedInterval,
        calendar_interval: calendarInterval,
        delay: rollupDelay,
        time_zone: dateHistogramTimeZone,
        field: dateHistogramField,
      },
      terms,
      histogram,
    },
  } = rollupAction;

  const dateHistogramIntervalType: InternalRollup['dateHistogramIntervalType'] = calendarInterval
    ? 'calendar'
    : 'fixed';

  // `interval` is deprecated but still supported. All three of the various interval types are
  // mutually exclusive.
  let dateHistogramInterval = interval || fixedInterval || calendarInterval || '';

  if (dateHistogramInterval && dateHistogramIntervalType === 'calendar') {
    switch (dateHistogramInterval) {
      case '1m':
        dateHistogramInterval = CALENDAR_INTERVAL_OPTIONS.minute;
        break;
      case '1h':
        dateHistogramInterval = CALENDAR_INTERVAL_OPTIONS.hour;
        break;
      case '1d':
        dateHistogramInterval = CALENDAR_INTERVAL_OPTIONS.day;
        break;
      case '1w':
        dateHistogramInterval = CALENDAR_INTERVAL_OPTIONS.week;
        break;
      case '1M':
        dateHistogramInterval = CALENDAR_INTERVAL_OPTIONS.month;
        break;
      case '1q':
        dateHistogramInterval = CALENDAR_INTERVAL_OPTIONS.quarter;
        break;
      case '1y':
        dateHistogramInterval = CALENDAR_INTERVAL_OPTIONS.year;
        break;
      default:
        dateHistogramInterval = '';
    }
  }

  const deserializedJob: InternalRollup = {
    dateHistogramIntervalType,
    dateHistogramInterval,
    rollupDelay,
    dateHistogramTimeZone,
    dateHistogramField,
    metrics: [],
    terms: [],
    histogram: [],
  };

  if (metrics) {
    metrics.forEach(({ field, metrics: innerMetrics }) => {
      deserializedJob.metrics.push({
        name: field,
        types: innerMetrics,
      });
    });
  }

  if (terms) {
    deserializedJob.terms = terms.fields.map((name) => ({ name }));
  }

  if (histogram) {
    deserializedJob.histogram = histogram.fields.map((name) => ({ name }));
    deserializedJob.histogramInterval = histogram.interval;
  }

  return deserializedJob;
}
