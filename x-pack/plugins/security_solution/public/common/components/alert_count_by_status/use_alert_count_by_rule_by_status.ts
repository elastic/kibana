/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect, useState } from 'react';

import type { Status } from '../../../../common/detection_engine/schemas/common';
import type { GenericBuckets } from '../../../../common/search_strategy';
import { ALERTS_QUERY_NAMES } from '../../../detections/containers/detection_engine/alerts/constants';
import { useQueryAlerts } from '../../../detections/containers/detection_engine/alerts/use_query';
import { useGlobalTime } from '../../containers/use_global_time';
import { useQueryInspector } from '../page/manage_query';

export interface AlertCountByRuleByStatusItem {
  ruleName: string;
  count: number;
}

export interface UseAlertCountByRuleByStatusProps {
  field: string;
  value: string;
  queryId: string;
  statuses: Status[];
  skip?: boolean;
}
type UseAlertCountByRuleByStatus = (props: UseAlertCountByRuleByStatusProps) => {
  items: AlertCountByRuleByStatusItem[];
  isLoading: boolean;
  updatedAt: number;
};

const ALERTS_BY_RULE_AGG = 'alertsByRuleAggregation';

export const useAlertCountByRuleByStatus: UseAlertCountByRuleByStatus = ({
  field,
  value,
  queryId,
  statuses,
  skip = false,
}) => {
  const [items, setItems] = useState<AlertCountByRuleByStatusItem[]>([]);
  const [updatedAt, setUpdatedAt] = useState(Date.now());
  const { to, from, deleteQuery, setQuery } = useGlobalTime();

  const {
    loading: isLoading,
    data,
    setQuery: setAlertsQuery,
    response,
    request,
    refetch: refetchQuery,
  } = useQueryAlerts({
    query: buildRuleAlertsByEntityQuery({
      from,
      to,
      field,
      value,
      statuses,
    }),
    skip,
    queryName: ALERTS_QUERY_NAMES.BY_RULE_BY_STATUS,
  });

  useEffect(() => {
    setAlertsQuery(
      buildRuleAlertsByEntityQuery({
        from,
        to,
        field,
        value,
        statuses,
      })
    );
  }, [setAlertsQuery, from, to, field, value, statuses]);

  useEffect(() => {
    if (!data) {
      setItems([]);
    } else {
      setItems(parseAlertCountByRuleItems(data.aggregations as AlertCountByRuleByFieldAggregation));
    }
    setUpdatedAt(Date.now());
  }, [data, field, from, statuses, to, value]);

  const refetch = useCallback(() => {
    if (!skip && refetchQuery) {
      refetchQuery();
    }
  }, [skip, refetchQuery]);

  useQueryInspector({
    deleteQuery,
    inspect: {
      dsl: [request],
      response: [response],
    },
    refetch,
    setQuery,
    queryId,
    loading: isLoading,
  });

  return { items, isLoading, updatedAt };
};

const buildRuleAlertsByEntityQuery = ({
  from,
  to,
  field,
  value,
  statuses,
}: {
  from: string;
  to: string;
  statuses: string[];
  field: string;
  value: string;
}) => ({
  size: 0,
  query: {
    bool: {
      filter: [
        {
          range: {
            '@timestamp': {
              gte: from,
              lte: to,
            },
          },
        },
        {
          terms: {
            'kibana.alert.workflow_status': statuses,
          },
        },
        {
          term: {
            [field]: value,
          },
        },
      ],
    },
  },
  aggs: {
    [ALERTS_BY_RULE_AGG]: {
      terms: {
        field: 'kibana.alert.rule.name',
        size: 100,
      },
    },
  },
});

interface AlertCountByRuleByFieldAggregation {
  [ALERTS_BY_RULE_AGG]: {
    buckets: GenericBuckets[];
  };
}

const parseAlertCountByRuleItems = (
  aggregations?: AlertCountByRuleByFieldAggregation
): AlertCountByRuleByStatusItem[] => {
  const buckets = aggregations?.[ALERTS_BY_RULE_AGG].buckets ?? [];
  return buckets.map<AlertCountByRuleByStatusItem>((bucket) => {
    return {
      ruleName: bucket.key,
      count: bucket.doc_count,
    };
  });
};
