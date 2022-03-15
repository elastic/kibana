/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useState } from 'react';

import { DEFAULT_MAX_TABLE_QUERY_SIZE } from '../../../../common/constants';
import { useGlobalTime } from '../use_global_time';
import { GenericBuckets } from '../../../../common/search_strategy';
import { useQueryAlerts } from '../../../detections/containers/detection_engine/alerts/use_query';

const ALERT_PREVALENCE_AGG = 'countOfAlertsWithSameFieldAndValue';
export const DETECTIONS_ALERTS_COUNT_ID = 'detections-alerts-count';

interface UseAlertPrevalenceOptions {
  field: string;
  value: string | string[] | undefined | null;
  signalIndexName: string | null;
}

interface UserAlertPrevalenceResult {
  loading: boolean;
  count: undefined | number;
  error: boolean;
}

export const useAlertPrevalence = ({
  field,
  value,
  signalIndexName,
}: UseAlertPrevalenceOptions): UserAlertPrevalenceResult => {
  const { to, from } = useGlobalTime();
  const [initialQuery] = useState(() => generateAlertPrevalenceQuery(field, value, from, to));

  const { loading, data, setQuery } = useQueryAlerts<{}, AlertPrevalenceAggregation>({
    query: initialQuery,
    indexName: signalIndexName,
  });

  useEffect(() => {
    setQuery(generateAlertPrevalenceQuery(field, value, from, to));
  }, [setQuery, field, value, from, to]);

  let count: undefined | number;
  if (data) {
    const buckets = data.aggregations?.[ALERT_PREVALENCE_AGG]?.buckets;
    if (buckets && buckets.length > 0) {
      count = buckets?.reduce((sum, bucket) => sum + (bucket?.doc_count ?? 0), 0);
    }
  }

  const error = !loading && count === undefined;

  return {
    loading,
    count,
    error,
  };
};

const generateAlertPrevalenceQuery = (
  field: string,
  value: string | string[] | undefined | null,
  from: string,
  to: string
) => {
  let query;

  query = {
    bool: {
      must: {
        match: {
          [field]: value,
        },
      },
      filter: [
        {
          range: {
            '@timestamp': {
              gte: from,
              lte: to,
            },
          },
        },
      ],
    },
  };

  if (Array.isArray(value)) {
    query = {
      terms: {
        [field]: value,
      },
    };
  }

  return {
    size: 0,
    aggs: {
      [ALERT_PREVALENCE_AGG]: {
        terms: {
          field,
          size: DEFAULT_MAX_TABLE_QUERY_SIZE,
        },
      },
    },
    query,
    runtime_mappings: {},
  };
};

export interface AlertPrevalenceAggregation {
  [ALERT_PREVALENCE_AGG]: {
    buckets: GenericBuckets[];
  };
}
