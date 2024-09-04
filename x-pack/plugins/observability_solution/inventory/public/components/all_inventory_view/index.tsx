/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useMemo, useState } from 'react';
import { useListEntitiesFetch } from '../../hooks/use_list_entities_fetch';
import { ControlledEntityTable } from '../entity_table';

export function AllInventoryView() {
  const [pagination, setPagination] = useState<{ pageIndex: number; pageSize: number }>({
    pageIndex: 0,
    pageSize: 25,
  });

  const entitiesFetch = useListEntitiesFetch({ type: 'all' });

  const [searchQuery, setSearchQuery] = useState('');

  const filteredItems = useMemo(() => {
    const entities = entitiesFetch.value?.entities;
    if (!entities || !searchQuery) {
      return entities || [];
    }

    const lowercasedSearchQuery = searchQuery.toLowerCase();

    return entities.filter((entity) => entity.name.toLowerCase().includes(lowercasedSearchQuery));
  }, [entitiesFetch.value?.entities, searchQuery]);

  const visibleItems = useMemo(() => {
    return filteredItems.slice(
      pagination.pageIndex * pagination.pageSize,
      pagination.pageIndex * pagination.pageSize + pagination.pageSize
    );
  }, [pagination.pageIndex, pagination.pageSize, filteredItems]);

  return (
    <ControlledEntityTable
      columns={[]}
      rows={visibleItems}
      loading={entitiesFetch.loading}
      query={searchQuery}
      pagination={pagination}
      onPaginationChange={(nextPagination) => {
        setPagination(nextPagination);
      }}
      onQueryChange={(nextQuery) => {
        setSearchQuery(nextQuery);
      }}
      onQuerySubmit={() => {}}
      totalItemCount={entitiesFetch.value?.entities.length ?? 0}
    />
  );
}
