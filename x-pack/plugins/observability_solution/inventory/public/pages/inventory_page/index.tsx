/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useCallback, useEffect, useState } from 'react';
import { decode, encode } from '@kbn/rison';
import { ENTITY_TYPE } from '@kbn/observability-shared-plugin/common';
import { GroupedInventoryView } from '../../components/grouped_inventory';
import { UngroupedInventoryView } from '../../components/grouped_inventory/ungrouped_view';
import { useInventoryParams } from '../../hooks/use_inventory_params';
import { useInventoryRouter } from '../../hooks/use_inventory_router';
import { InventoryPageViewContextProvider } from '../../context/inventory_page_view_provider';

const DEFAULT_GROUPING = ENTITY_TYPE;

export interface InventoryState {
  groupBy?: string;
  pagination?: Record<string, number>;
}

export function InventoryPage() {
  const { query } = useInventoryParams('/');
  const inventoryRoute = useInventoryRouter();

  const { view } = query;
  const [inventoryState, setInventoryState] = useState<InventoryState | undefined>(() =>
    view ? (decode(view) as InventoryState) : undefined
  );

  useEffect(() => {
    if (inventoryState) {
      const encodedView = encode(inventoryState);

      if (encodedView !== view) {
        inventoryRoute.replace('/', {
          path: {},
          query: {
            ...query,
            view: encodedView,
          },
        });
      }
    }
    // Only run the effect on a change for `inventoryState`. Other deps cause this to refire too many times.
    // Probably a better way of doing this.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inventoryState]);

  const setGrouping = useCallback(
    (field: string) => setInventoryState((state) => ({ ...state, groupBy: field })),
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
  const currentGrouping = inventoryState?.groupBy || DEFAULT_GROUPING;

  return (
    <InventoryPageViewContextProvider
      grouping={currentGrouping}
      pagination={inventoryState?.pagination}
      setGrouping={setGrouping}
      setPagination={setPagination}
    >
      {currentGrouping === 'none' ? <UngroupedInventoryView /> : <GroupedInventoryView />}
    </InventoryPageViewContextProvider>
  );
}
