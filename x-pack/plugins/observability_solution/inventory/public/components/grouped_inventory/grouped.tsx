/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiDataGridSorting, EuiAccordion } from '@elastic/eui';
import React from 'react';
import useEffectOnce from 'react-use/lib/useEffectOnce';
import { EntityType } from '../../../common/entities';
import { useInventorySearchBarContext } from '../../context/inventory_search_bar_context_provider';
import { useInventoryAbortableAsync } from '../../hooks/use_inventory_abortable_async';
import { useInventoryParams } from '../../hooks/use_inventory_params';
import { useInventoryRouter } from '../../hooks/use_inventory_router';
import { useKibana } from '../../hooks/use_kibana';
import { UngroupedInventoryPage } from './ungrouped';

export function GroupedInventoryPage() {
  const { searchBarContentSubject$ } = useInventorySearchBarContext();
  const {
    services: { inventoryAPIClient },
  } = useKibana();
  const { query } = useInventoryParams('/');
  const { sortDirection, sortField, pageIndex, kuery, entityTypes } = query;

  const inventoryRoute = useInventoryRouter();

  const {
    value = { groupBy: '', groups: [] },
    loading,
    refresh,
  } = useInventoryAbortableAsync(
    ({ signal }) => {
      return inventoryAPIClient.fetch('GET /internal/inventory/entities/group_by/{field}', {
        params: {
          path: {
            field: 'entity.type',
          },
          query: {
            sortDirection,
            kuery,
          },
        },
        signal,
      });
    },
    [entityTypes, inventoryAPIClient, kuery, sortDirection, sortField]
  );

  useEffectOnce(() => {
    const searchBarContentSubscription = searchBarContentSubject$.subscribe(
      ({ refresh: isRefresh, ...queryParams }) => {
        if (isRefresh) {
          refresh();
        } else {
          inventoryRoute.push('/', {
            path: {},
            query: { ...query, ...queryParams },
          });
        }
      }
    );
    return () => {
      searchBarContentSubscription.unsubscribe();
    };
  });

  function handlePageChange(nextPage: number) {
    inventoryRoute.push('/', {
      path: {},
      query: { ...query, pageIndex: nextPage },
    });
  }

  function handleSortChange(sorting: EuiDataGridSorting['columns'][0]) {
    inventoryRoute.push('/', {
      path: {},
      query: {
        ...query,
        sortField: sorting.id,
        sortDirection: sorting.direction,
      },
    });
  }

  function handleTypeFilter(entityType: EntityType) {
    inventoryRoute.push('/', {
      path: {},
      query: {
        ...query,
        // Override the current entity types
        entityTypes: [entityType],
      },
    });
  }

  return value.groups.map((group) => {
    return (
      <EuiAccordion
        id={group['entity.type']}
        buttonContent={`Type: ${group['entity.type']} (${group.count})`}
      >
        <UngroupedInventoryPage entityType={group['entity.type']} />
      </EuiAccordion>
    );
  });
}
