/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect, useState } from 'react';

import { useQueryInspector } from '../../../../common/components/page/manage_query';
import { useGlobalTime } from '../../../../common/containers/use_global_time';
import { GenericBuckets } from '../../../../../common/search_strategy';
import { useQueryAlerts } from '../../../../detections/containers/detection_engine/alerts/use_query';

const HOSTS_BY_SEVERITY_AGG = 'hostsBySeverity';

interface TimeRange {
  from: string;
  to: string;
}

export interface UseHostAlertsItemsProps {
  skip: boolean;
  queryId: string;
  signalIndexName: string | null;
}
export interface HostAlertsItem {
  hostName: string;
  totalAlerts: number;
  low: number;
  medium: number;
  high: number;
  critical: number;
}

export type UseHostAlertsItems = (props: UseHostAlertsItemsProps) => {
  items: HostAlertsItem[];
  isLoading: boolean;
  updatedAt: number;
};

export const useHostAlertsItems: UseHostAlertsItems = ({ skip, queryId, signalIndexName }) => {
  const [updatedAt, setUpdatedAt] = useState(Date.now());
  const [items, setItems] = useState<HostAlertsItem[]>([]);

  const { to, from, setQuery: setGlobalQuery, deleteQuery } = useGlobalTime();

  const {
    data,
    request,
    response,
    setQuery,
    loading,
    refetch: refetchQuery,
  } = useQueryAlerts<{}, AlertCountersBySeverityAndHostAggregation>({
    query: buildVulnerableHostAggregationQuery({ from, to }),
    indexName: signalIndexName,
    skip,
  });

  useEffect(() => {
    setQuery(buildVulnerableHostAggregationQuery({ from, to }));
  }, [setQuery, from, to]);

  useEffect(() => {
    if (data == null || !data.aggregations) {
      setItems([]);
    } else {
      setItems(parseHostsData(data.aggregations));
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
    setQuery: setGlobalQuery,
    queryId,
    loading,
  });
  return { items, isLoading: loading, updatedAt };
};

export const buildVulnerableHostAggregationQuery = ({ from, to }: TimeRange) => ({
  query: {
    bool: {
      filter: [
        {
          term: {
            'kibana.alert.workflow_status': 'open',
          },
        },
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
  },
  size: 0,
  aggs: {
    [HOSTS_BY_SEVERITY_AGG]: {
      terms: {
        field: 'host.name',
        order: [
          {
            'critical.doc_count': 'desc',
          },
          {
            'high.doc_count': 'desc',
          },
          {
            'medium.doc_count': 'desc',
          },
          {
            'low.doc_count': 'desc',
          },
        ],
        size: 4,
      },
      aggs: {
        critical: {
          filter: {
            term: {
              'kibana.alert.severity': 'critical',
            },
          },
        },
        high: {
          filter: {
            term: {
              'kibana.alert.severity': 'high',
            },
          },
        },
        medium: {
          filter: {
            term: {
              'kibana.alert.severity': 'medium',
            },
          },
        },
        low: {
          filter: {
            term: {
              'kibana.alert.severity': 'low',
            },
          },
        },
      },
    },
  },
});

interface SeverityContainer {
  doc_count: number;
}
interface AlertBySeverityBucketData extends GenericBuckets {
  low: SeverityContainer;
  medium: SeverityContainer;
  high: SeverityContainer;
  critical: SeverityContainer;
}

interface AlertCountersBySeverityAndHostAggregation {
  [HOSTS_BY_SEVERITY_AGG]: {
    buckets: AlertBySeverityBucketData[];
  };
}

function parseHostsData(
  rawAggregation: AlertCountersBySeverityAndHostAggregation
): HostAlertsItem[] {
  const buckets = rawAggregation?.[HOSTS_BY_SEVERITY_AGG].buckets ?? [];

  return buckets.reduce<HostAlertsItem[]>((accumalatedAlertsByHost, currentHost) => {
    return [
      ...accumalatedAlertsByHost,
      {
        hostName: currentHost.key,
        totalAlerts: currentHost.doc_count,
        low: currentHost.low.doc_count,
        medium: currentHost.medium.doc_count,
        high: currentHost.high.doc_count,
        critical: currentHost.critical.doc_count,
      },
    ];
  }, []);
}
