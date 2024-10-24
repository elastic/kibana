/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useEffect } from 'react';
import { useInventoryParams } from '../../hooks/use_inventory_params';
import { useInventorySearchBarContext } from '../../context/inventory_search_bar_context_provider';
import { useInventoryRouter } from '../../hooks/use_inventory_router';
import { UnifiedInventory } from '../../components/grouped_inventory/unified_inventory';
import { GroupedInventory } from '../../components/grouped_inventory';

export function InventoryPage() {
  const { searchBarContentSubject$ } = useInventorySearchBarContext();
  const inventoryRoute = useInventoryRouter();
  const { query } = useInventoryParams('/');

  useEffect(() => {
    const searchBarContentSubscription = searchBarContentSubject$.subscribe(
      ({ ...queryParams }) => {
        const { pagination: _, ...rest } = query;

        inventoryRoute.push('/', {
          path: {},
          query: { ...rest, ...queryParams },
        });
      }
    );
    return () => {
      searchBarContentSubscription.unsubscribe();
    };
    // If query has updated, the inventoryRoute state is also updated
    // as well, so we only need to track changes on query.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, searchBarContentSubject$]);

  return query.view === 'unified' ? <UnifiedInventory /> : <GroupedInventory />;
}
