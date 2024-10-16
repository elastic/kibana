/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useCallback, useEffect, useState } from 'react';
import { decode, encode } from '@kbn/rison';
import { UngroupedInventoryPage } from '../../components/grouped_inventory/ungrouped';
import { GroupedInventoryPage } from '../../components/grouped_inventory/grouped';
import { useInventoryParams } from '../../hooks/use_inventory_params';
import { useInventoryRouter } from '../../hooks/use_inventory_router';
import { InventoryPageViewContextProvider } from '../../context/inventory_page_view_provider';

const DEFAULT_VIEW = 'none';

export interface InventoryState {
  grouping?: string;
  pagination?: Record<string, number>;
}

export function InventoryPage() {
  const { query } = useInventoryParams('/');
  const inventoryRoute = useInventoryRouter();

  const { grouping } = query;
  const [inventoryState, setInventoryState] = useState<InventoryState | undefined>(() =>
    grouping ? (decode(grouping) as InventoryState) : undefined
  );

  useEffect(() => {
    if (inventoryState) {
      const encodedGrouping = encode(inventoryState);

      if (encodedGrouping !== grouping) {
        inventoryRoute.replace('/', {
          path: {},
          query: {
            ...query,
            grouping: encodedGrouping,
          },
        });
      }
    }
    // Only run the effect on a change for `inventoryState`. Other deps cause this to refire too many times.
    // Probably a better way of doing this.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inventoryState]);

  const setGrouping = useCallback(
    (kind: string) => setInventoryState((state) => ({ ...state, grouping: kind })),
    []
  );
  const setPagination = useCallback(
    (group: string, nextPage: number) =>
      setInventoryState((state) => ({
        ...state,
        pagination: { ...state?.pagination, [group]: nextPage },
      })),
    []
  );

  // If state or grouping itself is `undefined`, fallback to the default view
  const activeView = !inventoryState?.grouping ? DEFAULT_VIEW : inventoryState.grouping;

  return (
    <InventoryPageViewContextProvider
      grouping={inventoryState?.grouping || DEFAULT_VIEW}
      pagination={inventoryState?.pagination}
      setGrouping={setGrouping}
      setPagination={setPagination}
    >
      {activeView === 'none' ? <UngroupedInventoryPage /> : <GroupedInventoryPage />}
    </InventoryPageViewContextProvider>
  );
}
