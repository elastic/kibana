/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { safeDecode, encode } from '@kbn/rison';
import { UngroupedInventoryPage } from '../../components/grouped_inventory/ungrouped';
import { GroupedInventoryPage } from '../../components/grouped_inventory/grouped';
import { useInventoryParams } from '../../hooks/use_inventory_params';
import { useInventoryRouter } from '../../hooks/use_inventory_router';
import { InventoryPageViewContextProvider } from '../../context/inventory_page_view_provider';

export interface InventoryState {
  grouping: string;
  pagination: Record<string, number>;
}

export function InventoryPage() {
  const { query } = useInventoryParams('/');
  const inventoryRoute = useInventoryRouter();

  const { grouping: queryGroup } = query;
  const [inventoryState, setInventoryState] = useState<InventoryState>(() =>
    queryGroup
      ? (safeDecode(queryGroup) as unknown as InventoryState)
      : { grouping: 'none', pagination: {} }
  );

  useEffect(() => {
    inventoryRoute.replace('/', {
      path: {},
      query: {
        ...query,
        grouping: encode(inventoryState),
      },
    });
    // Only run the effect on a change for `grouping`. Other deps cause this to refire too many times.
    // Probably a better way of doing this.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inventoryState]);

  const grouping = useMemo(() => inventoryState.grouping, [inventoryState.grouping]);
  const pagination = useMemo(() => inventoryState.pagination, [inventoryState.pagination]);

  const setGrouping = useCallback(
    (kind: string) => setInventoryState((state) => ({ ...state, grouping: kind })),
    []
  );
  const setPagination = useCallback(
    (group: string, nextPage: number) =>
      setInventoryState((state) => ({
        ...state,
        pagination: { ...state.pagination, [group]: nextPage },
      })),
    []
  );

  return (
    <InventoryPageViewContextProvider
      grouping={grouping}
      setGrouping={setGrouping}
      pagination={pagination}
      setPagination={setPagination}
    >
      {grouping === 'none' ? <UngroupedInventoryPage /> : <GroupedInventoryPage />}
    </InventoryPageViewContextProvider>
  );
}
