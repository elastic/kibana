/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiDataGridSorting } from '@elastic/eui';
import React from 'react';
import useEffectOnce from 'react-use/lib/useEffectOnce';
import { type EntityColumnIds } from '../../../common/entities';
import { entityPaginationRt } from '../../../common/rt_types';
import { useInventoryAbortableAsync } from '../../hooks/use_inventory_abortable_async';
import { useInventoryDecodedQueryParams } from '../../hooks/use_inventory_decoded_query_params';
import { useInventoryParams } from '../../hooks/use_inventory_params';
import { useInventoryRouter } from '../../hooks/use_inventory_router';
import { useKibana } from '../../hooks/use_kibana';
import { useUnifiedSearchContext } from '../../hooks/use_unified_search_context';
import { EntitiesGrid } from '../entities_grid';

interface Props {
  groupValue: string;
}

export function GroupedEntitiesGrid({ groupValue }: Props) {
  const { query } = useInventoryParams('/');
  const { sortField, sortDirection, kuery } = query;
  const { pagination } = useInventoryDecodedQueryParams();
  const inventoryRoute = useInventoryRouter();
  const pageIndex = pagination?.[groupValue] ?? 0;

  const { refreshSubject$ } = useUnifiedSearchContext();
  const {
    services: { inventoryAPIClient },
  } = useKibana();

  const {
    value = { entities: [] },
    loading,
    refresh,
  } = useInventoryAbortableAsync(
    ({ signal }) => {
      return inventoryAPIClient.fetch('GET /internal/inventory/entities', {
        params: {
          query: {
            sortDirection,
            sortField,
            kuery,
            entityTypes: groupValue?.length ? JSON.stringify([groupValue]) : undefined,
          },
        },
        signal,
      });
    },
    [groupValue, inventoryAPIClient, sortDirection, sortField, kuery]
  );

  useEffectOnce(() => {
    const refreshSubscription = refreshSubject$.subscribe(refresh);

    return () => refreshSubscription.unsubscribe();
  });

  function handlePageChange(nextPage: number) {
    inventoryRoute.push('/', {
      path: {},
      query: {
        ...query,
        pagination: entityPaginationRt.encode({
          ...pagination,
          [groupValue]: nextPage,
        }),
      },
    });
  }

  function handleSortChange(sorting: EuiDataGridSorting['columns'][0]) {
    inventoryRoute.push('/', {
      path: {},
      query: {
        ...query,
        sortField: sorting.id as EntityColumnIds,
        sortDirection: sorting.direction,
      },
    });
  }

  return (
    <EntitiesGrid
      entities={value.entities}
      loading={loading}
      sortDirection={sortDirection}
      sortField={sortField}
      onChangePage={handlePageChange}
      onChangeSort={handleSortChange}
      pageIndex={pageIndex}
    />
  );
}
