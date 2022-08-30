/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect, useState } from 'react';

import { useQueryInspector } from '../../../../common/components/page/manage_query';
import { useGlobalTime } from '../../../../common/containers/use_global_time';
import type { GenericBuckets } from '../../../../../common/search_strategy';
import { useQueryAlerts } from '../../../../detections/containers/detection_engine/alerts/use_query';
import { ALERTS_QUERY_NAMES } from '../../../../detections/containers/detection_engine/alerts/constants';
import { getPageCount, ITEMS_PER_PAGE } from '../utils';

const USERS_BY_SEVERITY_AGG = 'usersBySeverity';
const defaultPagination = {
  pageCount: 0,
  currentPage: 0,
};

interface TimeRange {
  from: string;
  to: string;
}

export interface UseUserAlertsItemsProps {
  skip: boolean;
  queryId: string;
  signalIndexName: string | null;
}

export interface UserAlertsItem {
  userName: string;
  totalAlerts: number;
  low: number;
  medium: number;
  high: number;
  critical: number;
}

export type UseUserAlertsItems = (props: UseUserAlertsItemsProps) => {
  items: UserAlertsItem[];
  isLoading: boolean;
  updatedAt: number;
  pagination: Pagination & { setPage: (pageNumber: number) => void };
};

interface Pagination {
  pageCount: number;
  currentPage: number;
}

export const useUserAlertsItems: UseUserAlertsItems = ({ skip, queryId, signalIndexName }) => {
  const [updatedAt, setUpdatedAt] = useState(Date.now());
  const [items, setItems] = useState<UserAlertsItem[]>([]);
  const [paginationData, setPaginationData] = useState<Pagination>(defaultPagination);

  const { to, from, setQuery: setGlobalQuery, deleteQuery } = useGlobalTime();

  const {
    setQuery,
    data,
    loading,
    request,
    response,
    refetch: refetchQuery,
  } = useQueryAlerts<{}, AlertCountersBySeverityAggregation>({
    query: buildVulnerableUserAggregationQuery({
      from,
      to,
      currentPage: paginationData.currentPage,
    }),
    indexName: signalIndexName,
    skip,
    queryName: ALERTS_QUERY_NAMES.VULNERABLE_USERS,
  });

  useEffect(() => {
    setQuery(
      buildVulnerableUserAggregationQuery({ from, to, currentPage: paginationData.currentPage })
    );
  }, [setQuery, from, to, paginationData.currentPage]);

  useEffect(() => {
    if (data == null || !data.aggregations) {
      setItems([]);
    } else {
      setItems(parseUsersData(data.aggregations));

      setPaginationData((p) => ({
        ...p,
        pageCount: getPageCount(data.aggregations?.user_count.value),
      }));
    }
    setUpdatedAt(Date.now());
  }, [data]);

  const refetch = useCallback(() => {
    if (!skip && refetchQuery) {
      refetchQuery();
    }
  }, [skip, refetchQuery]);

  const setPage = (pageNumber: number) => {
    setPaginationData((p) => ({
      ...p,
      currentPage: pageNumber,
    }));
  };

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

  return {
    items,
    isLoading: loading,
    updatedAt,
    pagination: {
      ...paginationData,
      setPage,
    },
  };
};

export const buildVulnerableUserAggregationQuery = ({
  from,
  to,
  currentPage,
}: TimeRange & { currentPage: number }) => {
  const fromValue = ITEMS_PER_PAGE * currentPage;

  return {
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
      user_count: { cardinality: { field: 'user.name' } },
      [USERS_BY_SEVERITY_AGG]: {
        terms: {
          size: 100,
          field: 'user.name',
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
          bucketOfPagination: {
            bucket_sort: {
              from: fromValue,
              size: 4,
            },
          },
        },
      },
    },
  };
};

interface SeverityContainer {
  doc_count: number;
}

interface AlertBySeverityBucketData extends GenericBuckets {
  low: SeverityContainer;
  medium: SeverityContainer;
  high: SeverityContainer;
  critical: SeverityContainer;
}

interface AlertCountersBySeverityAggregation {
  [USERS_BY_SEVERITY_AGG]: {
    buckets: AlertBySeverityBucketData[];
  };
  user_count: { value: number };
}

function parseUsersData(rawAggregation: AlertCountersBySeverityAggregation): UserAlertsItem[] {
  const buckets = rawAggregation?.[USERS_BY_SEVERITY_AGG].buckets ?? [];

  return buckets.reduce<UserAlertsItem[]>((accumalatedAlertsByUser, currentUser) => {
    accumalatedAlertsByUser.push({
      userName: currentUser.key || '—',
      totalAlerts: currentUser.doc_count,
      low: currentUser.low.doc_count,
      medium: currentUser.medium.doc_count,
      high: currentUser.high.doc_count,
      critical: currentUser.critical.doc_count,
    });

    return accumalatedAlertsByUser;
  }, []);
}
