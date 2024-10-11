/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { useInventorySearchBarContext } from '../../context/inventory_search_bar_context_provider';
import { useKibana } from '../../hooks/use_kibana';
import { EntitiesGrid } from '../entities_grid';
import { EntityType } from '../../../common/entities';
import { useInventoryAbortableAsync } from '../../hooks/use_inventory_abortable_async';

interface Props {
  entityType?: EntityType;
}

export function EntityGridWrapper({ entityType }: Props) {
  const { searchBarContentSubject$ } = useInventorySearchBarContext();
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
            entityTypes: entityType?.length ? JSON.stringify([entityType]) : undefined,
            kuery,
          },
        },
        signal,
      });
    },
    [entityType, inventoryAPIClient, kuery, sortDirection, sortField]
  );

  return (
    <EntitiesGrid
      entities={value.entities}
      loading={loading}
      sortDirection={sortDirection}
      sortField={sortField}
      onChangePage={handlePageChange}
      onChangeSort={handleSortChange}
      pageIndex={pageIndex}
      onFilterByType={handleTypeFilter}
    />
  );
}
