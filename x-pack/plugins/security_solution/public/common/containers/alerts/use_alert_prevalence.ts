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
import { TimelineId } from '../../../../common/types';
import { useDeepEqualSelector } from '../../hooks/use_selector';
import { inputsSelectors } from '../../store';

const ALERT_PREVALENCE_AGG = 'countOfAlertsWithSameFieldAndValue';
export const DETECTIONS_ALERTS_COUNT_ID = 'detections-alerts-count';

interface UseAlertPrevalenceOptions {
  field: string;
  value: string | string[] | undefined | null;
  timelineId: string;
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
  timelineId,
  signalIndexName,
}: UseAlertPrevalenceOptions): UserAlertPrevalenceResult => {
  const timelineTime = useDeepEqualSelector((state) =>
    inputsSelectors.timelineTimeRangeSelector(state)
  );
  const globalTime = useGlobalTime();

  const { to, from } = timelineId === TimelineId.active ? timelineTime : globalTime;
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
      /**
       * Currently for array fields like `process.args` or potentially any `ip` fields
       * We show the combined count of all occurences of the value, even though those values
       * could be shared across multiple documents. To make this clearer, we should separate
       * these values into separate table rows
       */
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
  const actualValue = Array.isArray(value) && value.length === 1 ? value[0] : value;
  let query;
  query = {
    bool: {
      must: {
        match: {
          [field]: actualValue,
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

  if (Array.isArray(value) && value.length > 1) {
    const shouldValues = value.map((val) => ({ match: { [field]: val } }));
    query = {
      bool: {
        minimum_should_match: 1,
        must: [
          {
            range: {
              '@timestamp': {
                gte: from,
                lte: to,
              },
            },
          },
        ],
        should: shouldValues,
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
