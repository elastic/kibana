/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { capitalize, get } from 'lodash';

export const getDiffCalculation = (max, min) => {
  // no need to test max >= 0, but min <= 0 which is normal for a derivative after restart
  // because we are aggregating/collapsing on ephemeral_ids
  if (
    max !== null && min !== null &&
    max >= 0 && min >= 0 &&
    max >= min
  ) {
    return max - min;
  }

  return null;
};

export const apmAggFilterPath = [
  'aggregations.total',
  'aggregations.types.buckets.key',
  'aggregations.types.buckets.uuids.buckets.doc_count',
  'aggregations.min_events_total.value',
  'aggregations.max_events_total.value',
  'aggregations.min_bytes_sent_total.value',
  'aggregations.max_bytes_sent_total.value',
];

export const apmUuidsAgg = maxBucketSize => ({
  types: {
    terms: {
      field: 'beats_stats.beat.type',
      size: 1000 // 1000 different types of beats possible seems like enough
    },
    aggs: {
      uuids: {
        terms: {
          field: 'beats_stats.beat.uuid',
          size: maxBucketSize,
        }
      }
    }
  },
  total: {
    cardinality: {
      field: 'beats_stats.beat.uuid',
      precision_threshold: 10000
    }
  },
  min_events_total: {
    min: {
      field: 'beats_stats.metrics.libbeat.pipeline.events.total'
    }
  },
  max_events_total: {
    max: {
      field: 'beats_stats.metrics.libbeat.pipeline.events.total'
    }
  },
  min_bytes_sent_total: {
    min: {
      field: 'beats_stats.metrics.libbeat.output.write.bytes'
    }
  },
  max_bytes_sent_total: {
    max: {
      field: 'beats_stats.metrics.libbeat.output.write.bytes'
    }
  },
});

export const apmAggResponseHandler = response => {
  // beat types stat
  const buckets = get(response, 'aggregations.types.buckets', []);
  const beatTotal = get(response, 'aggregations.total.value', null);
  const beatTypes = buckets.reduce((types, typeBucket) => {
    return [
      ...types,
      {
        type: capitalize(typeBucket.key),
        count: get(typeBucket, 'uuids.buckets.length'),
      }
    ];
  }, []);

  const eventsTotalMax = get(response, 'aggregations.max_events_total.value', null);
  const eventsTotalMin = get(response, 'aggregations.min_events_total.value', null);
  const bytesSentMax = get(response, 'aggregations.max_bytes_sent_total.value', null);
  const bytesSentMin = get(response, 'aggregations.min_bytes_sent_total.value', null);

  return {
    beatTotal,
    beatTypes,
    totalEvents: getDiffCalculation(eventsTotalMax, eventsTotalMin),
    bytesSent: getDiffCalculation(bytesSentMax, bytesSentMin),
  };
};
