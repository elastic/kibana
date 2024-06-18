/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { CriteriaWithPagination, EuiTableSortingType, Pagination } from '@elastic/eui';
import type { GlobalWidgetParameters, OnWidgetAdd } from '@kbn/investigate-plugin/public';
import { merge } from 'lodash';
import React, { useCallback, useMemo, useRef, useState } from 'react';
import { useFetchSloList } from '../../hooks/use_fetch_slo_list';
import {
  InteractiveSLOItem,
  SloListCompactViewWithoutRouterContext,
} from '../../pages/slos/components/compact_view/slo_list_compact_view';
import { createInvestigateSloDetailWidget } from '../investigate_slo_detail/create_investigate_slo_detail_widget';

export function InvestigateSloInventory({
  filters,
  query,
  timeRange,
  onWidgetAdd,
}: GlobalWidgetParameters & { onWidgetAdd: OnWidgetAdd }) {
  const kuery = query.query;

  const [criteria, setCriteria] = useState({
    page: {
      index: 0,
      size: 10,
    },
    sort: {
      direction: 'desc' as 'asc' | 'desc',
      field: 'status',
    },
  });

  const {
    isLoading,
    isRefetching,
    isError,
    data: sloList,
  } = useFetchSloList({
    tagsFilter: undefined,
    statusFilter: undefined,
    perPage: 10,
    filters,
    page: criteria.page.index + 1,
    kqlQuery: kuery,
    sortBy: criteria.sort.field,
    sortDirection: criteria.sort.direction,
    lastRefresh: undefined,
  });

  const sloListResults = useMemo(() => {
    return sloList?.results ?? [];
  }, [sloList]);

  const onWidgetAddRef = useRef(onWidgetAdd);

  onWidgetAddRef.current = onWidgetAdd;

  const itemsWithInteractivity = useMemo(() => {
    return sloListResults.map((item): InteractiveSLOItem => {
      return {
        ...item,
        interactions: {
          detail: {
            onClick: (event) => {
              event.stopPropagation();
              event.preventDefault();
              onWidgetAddRef.current(
                createInvestigateSloDetailWidget({
                  title: item.name,
                  parameters: {
                    sloId: item.id,
                    remoteName: item.remote?.remoteName,
                  },
                })
              );
            },
          },
          activeAlerts: {
            onClick: () => {},
          },
          remote: {
            onClick: (event) => {},
          },
          rules: {
            onClick: (event) => {},
          },
        },
      };
    });
  }, [sloListResults]);

  const actions = useMemo(() => [], []);

  const onChange = useCallback((nextCriteria: CriteriaWithPagination<InteractiveSLOItem>) => {
    setCriteria((prev) => merge({}, prev, nextCriteria));
  }, []);

  const sorting = useMemo<EuiTableSortingType<InteractiveSLOItem>>(() => {
    return {
      sort: {
        direction: criteria.sort.direction,
        field: criteria.sort.field as keyof InteractiveSLOItem,
      },
    };
  }, [criteria]);

  const pagination = useMemo<Pagination>(() => {
    return {
      pageIndex: criteria.page.index,
      pageSize: criteria.page.size,
      totalItemCount: sloList?.total ?? 0,
    };
  }, [criteria, sloList]);

  return (
    <SloListCompactViewWithoutRouterContext
      error={isError}
      loading={isLoading || isRefetching}
      items={itemsWithInteractivity}
      actions={actions}
      onChange={onChange}
      pagination={pagination}
      sorting={sorting}
    />
  );
}
