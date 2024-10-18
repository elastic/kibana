/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import useEffectOnce from 'react-use/lib/useEffectOnce';
import { GroupedInventoryView } from '../../components/grouped_inventory';
import { UnifiedInventoryView } from '../../components/grouped_inventory/unified_view';
import { useInventoryState } from '../../hooks/use_inventory_state';
import { useInventoryRouter } from '../../hooks/use_inventory_router';
import { useInventorySearchBarContext } from '../../context/inventory_search_bar_context_provider';
import { useInventoryParams } from '../../hooks/use_inventory_params';

export function InventoryPage() {
  const { groupBy } = useInventoryState();
  const { searchBarContentSubject$ } = useInventorySearchBarContext();
  const inventoryRoute = useInventoryRouter();
  const { query } = useInventoryParams('/');

  useEffectOnce(() => {
    const searchBarContentSubscription = searchBarContentSubject$.subscribe(
      ({ refresh: isRefresh, ...queryParams }) => {
        if (isRefresh) {
          // refresh();
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

  return groupBy === 'unified' ? <UnifiedInventoryView /> : <GroupedInventoryView />;
}
