/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useState } from 'react';

import { DEFAULT_MAX_TABLE_QUERY_SIZE } from '../../../../common/constants';
import { useGlobalTime } from '../use_global_time';
import type { GenericBuckets } from '../../../../common/search_strategy';
import { useQueryAlerts } from '../../../detections/containers/detection_engine/alerts/use_query';
import { ALERTS_QUERY_NAMES } from '../../../detections/containers/detection_engine/alerts/constants';
import { useDeepEqualSelector } from '../../hooks/use_selector';
import { inputsSelectors } from '../../store';

const ALERT_PREVALENCE_AGG = 'countOfAlertsWithSameFieldAndValue';

interface UseAlertPrevalenceOptions {
  field: string;
  value: string | string[] | undefined | null;
  isActiveTimelines: boolean;
  signalIndexName: string | null;
  includeAlertIds?: boolean;
  ignoreTimerange?: boolean;
}

interface UserAlertPrevalenceResult {
  loading: boolean;
  count: undefined | number;
  error: boolean;
  alertIds?: string[];
}

export const useAlertPrevalence = ({
  field,
  value,
  isActiveTimelines,
  signalIndexName,
  includeAlertIds = false,
  ignoreTimerange = false,
}: UseAlertPrevalenceOptions): UserAlertPrevalenceResult => {
  const timelineTime = useDeepEqualSelector((state) =>
    inputsSelectors.timelineTimeRangeSelector(state)
  );
  const globalTime = useGlobalTime(false);
  let to: string | undefined;
  let from: string | undefined;
  if (ignoreTimerange === false) {
    ({ to, from } = isActiveTimelines ? timelineTime : globalTime);
  }
  const [initialQuery] = useState(() =>
    generateAlertPrevalenceQuery(field, value, from, to, includeAlertIds)
  );

  const { loading, data, setQuery } = useQueryAlerts<{ _id: string }, AlertPrevalenceAggregation>({
    query: initialQuery,
    indexName: signalIndexName,
    queryName: ALERTS_QUERY_NAMES.PREVALENCE,
  });

  useEffect(() => {
    setQuery(generateAlertPrevalenceQuery(field, value, from, to, includeAlertIds));
  }, [setQuery, field, value, from, to, includeAlertIds]);

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
  const alertIds = data?.hits.hits.map(({ _id }) => _id);

  return {
    loading,
    count,
    error,
    alertIds,
  };
};

const generateAlertPrevalenceQuery = (
  field: string,
  value: string | string[] | undefined | null,
  from: string | undefined,
  to: string | undefined,
  includeAlertIds: boolean
) => {
  // if we don't want the alert ids included, we set size to 0 to reduce the response payload
  const size = includeAlertIds ? { size: DEFAULT_MAX_TABLE_QUERY_SIZE } : { size: 0 };
  // in that case, we also want to make sure we're sorting the results by timestamp
  const sort = includeAlertIds ? { sort: { '@timestamp': 'desc' } } : {};

  const actualValue = Array.isArray(value) && value.length === 1 ? value[0] : value;
  let query;
  query = {
    bool: {
      must: {
        match: {
          [field]: actualValue,
        },
      },
    },
  };

  if (from !== undefined && to !== undefined) {
    query = {
      ...query,
      bool: {
        ...query.bool,
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
  }

  if (Array.isArray(value) && value.length > 1) {
    const shouldValues = value.map((val) => ({ match: { [field]: val } }));
    query = {
      bool: {
        minimum_should_match: 1,
        should: shouldValues,
      },
    };
    if (from !== undefined && to !== undefined) {
      query = {
        ...query,
        bool: {
          ...query.bool,
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
        },
      };
    }
  }

  return {
    ...size,
    ...sort,
    _source: false,
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
