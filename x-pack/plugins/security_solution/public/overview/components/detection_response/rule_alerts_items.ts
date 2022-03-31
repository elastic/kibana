/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect, useMemo } from 'react';
import uuid from 'uuid';
import { Severity } from '@kbn/securitysolution-io-ts-alerting-types';
import { useGlobalTime } from '../../../common/containers/use_global_time';
import { useQueryAlerts } from '../../../detections/containers/detection_engine/alerts/use_query';
import { useQueryInspector } from '../../../common/components/page/manage_query';

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
                'kibana.alert.severity': Severity;
              };
            }
          ];
        };
      };
    }>;
  };
}

export const DETECTION_RESPONSE_RULE_ALERTS_ID = 'detection-response-rule-alerts-id';

export const getSeverityRuleAlertsQuery = ({ from, to }: { from: string; to: string }) => ({
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
        field: 'kibana.alert.rule.uuid',
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

export const getRuleAlertsItemsFromAggs = (
  aggregations?: SeverityRuleAlertsAggsResponse
): RuleAlertsItem[] => {
  const buckets = aggregations?.alertsByRule.buckets ?? [];
  return buckets.map<RuleAlertsItem>((bucket) => {
    const lastAlert = bucket.lastRuleAlert.hits.hits[0]._source;
    return {
      id: bucket.key,
      alert_count: bucket.lastRuleAlert.hits.total.value,
      name: lastAlert['kibana.alert.rule.name'],
      last_alert_at: lastAlert['@timestamp'],
      severity: lastAlert['kibana.alert.severity'],
    };
  });
};

export const useRuleAlertsItems = ({ signalIndexName }: { signalIndexName: string | null }) => {
  const { to, from, deleteQuery, setQuery } = useGlobalTime();
  // create a unique, but stable (across re-renders) query id
  const queryId = useMemo(() => `${DETECTION_RESPONSE_RULE_ALERTS_ID}-${uuid.v4()}`, []);

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
  });

  const items = useMemo(() => {
    if (data == null) {
      return [];
    }
    return getRuleAlertsItemsFromAggs(data.aggregations);
  }, [data]);

  useEffect(() => {
    setAlertsQuery(
      getSeverityRuleAlertsQuery({
        from,
        to,
      })
    );
  }, [setAlertsQuery, from, to]);

  const refetch = useCallback(() => {
    if (refetchQuery) {
      refetchQuery();
    }
  }, [refetchQuery]);

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

  return { items, isLoading, queryId };
};
