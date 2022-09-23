/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect, useState } from 'react';
import type { Severity } from '@kbn/securitysolution-io-ts-alerting-types';
import { useGlobalTime } from '../../../../common/containers/use_global_time';
import { useQueryAlerts } from '../../../../detections/containers/detection_engine/alerts/use_query';
import { ALERTS_QUERY_NAMES } from '../../../../detections/containers/detection_engine/alerts/constants';
import { useQueryInspector } from '../../../../common/components/page/manage_query';

// Formatted item result
export interface RuleAlertsItem {
  id: string;
  name: string;
  last_alert_at: string;
  alert_count: number;
  severity: Severity;
}

// Raw aggregation response
export interface SeverityRuleAlertsAggsResponse {
  alertsByRule: {
    buckets?: Array<{
      key: string;
      doc_count: number;
      lastRuleAlert: {
        hits: {
          total: {
            value: number;
          };
          hits: [
            {
              _source: {
                '@timestamp': string;
                'kibana.alert.rule.name': string;
                'kibana.alert.rule.uuid': string;
                'kibana.alert.severity': Severity;
              };
            }
          ];
        };
      };
    }>;
  };
}

const getSeverityRuleAlertsQuery = ({ from, to }: { from: string; to: string }) => ({
  size: 0,
  query: {
    bool: {
      filter: [
        { term: { 'kibana.alert.workflow_status': 'open' } },
        { range: { '@timestamp': { gte: from, lte: to } } },
      ],
    },
  },
  aggs: {
    alertsByRule: {
      terms: {
        // top 4 rules sorted by severity counters
        field: 'kibana.alert.rule.name',
        size: 4,
        order: [{ critical: 'desc' }, { high: 'desc' }, { medium: 'desc' }, { low: 'desc' }],
      },
      aggs: {
        // severity aggregations for sorting
        critical: { filter: { term: { 'kibana.alert.severity': 'critical' } } },
        high: { filter: { term: { 'kibana.alert.severity': 'high' } } },
        medium: { filter: { term: { 'kibana.alert.severity': 'medium' } } },
        low: { filter: { term: { 'kibana.alert.severity': 'low' } } },
        // get the newest alert to extract timestamp and rule name
        lastRuleAlert: {
          top_hits: {
            size: 1,
            sort: {
              '@timestamp': 'desc',
            },
          },
        },
      },
    },
  },
});

const getRuleAlertsItemsFromAggs = (
  aggregations?: SeverityRuleAlertsAggsResponse
): RuleAlertsItem[] => {
  const buckets = aggregations?.alertsByRule.buckets ?? [];
  return buckets.map<RuleAlertsItem>((bucket) => {
    const lastAlert = bucket.lastRuleAlert.hits.hits[0]._source;

    return {
      id: lastAlert['kibana.alert.rule.uuid'],
      alert_count: bucket.lastRuleAlert.hits.total.value,
      name: lastAlert['kibana.alert.rule.name'],
      last_alert_at: lastAlert['@timestamp'],
      severity: lastAlert['kibana.alert.severity'],
    };
  });
};

export interface UseRuleAlertsItemsProps {
  queryId: string;
  signalIndexName: string | null;
  skip?: boolean;
}
export type UseRuleAlertsItems = (props: UseRuleAlertsItemsProps) => {
  items: RuleAlertsItem[];
  isLoading: boolean;
  updatedAt: number;
};

export const useRuleAlertsItems: UseRuleAlertsItems = ({
  queryId,
  signalIndexName,
  skip = false,
}) => {
  const [items, setItems] = useState<RuleAlertsItem[]>([]);
  const [updatedAt, setUpdatedAt] = useState(Date.now());
  const { to, from, deleteQuery, setQuery } = useGlobalTime();

  const {
    loading: isLoading,
    data,
    setQuery: setAlertsQuery,
    response,
    request,
    refetch: refetchQuery,
  } = useQueryAlerts<{}, SeverityRuleAlertsAggsResponse>({
    query: getSeverityRuleAlertsQuery({
      from,
      to,
    }),
    indexName: signalIndexName,
    skip,
    queryName: ALERTS_QUERY_NAMES.BY_SEVERITY,
  });

  useEffect(() => {
    setAlertsQuery(
      getSeverityRuleAlertsQuery({
        from,
        to,
      })
    );
  }, [setAlertsQuery, from, to]);

  useEffect(() => {
    if (data == null) {
      setItems([]);
    } else {
      setItems(getRuleAlertsItemsFromAggs(data.aggregations));
    }
    setUpdatedAt(Date.now());
  }, [data]);

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
