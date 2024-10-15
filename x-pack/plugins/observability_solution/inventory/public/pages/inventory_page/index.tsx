/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useEffect, useState } from 'react';
import { UngroupedInventoryPage } from '../../components/grouped_inventory/ungrouped';
import { GroupedInventoryPage } from '../../components/grouped_inventory/grouped';
import { useInventoryParams } from '../../hooks/use_inventory_params';
import { useInventoryRouter } from '../../hooks/use_inventory_router';
import { InventoryPageViewContextProvider } from '../../context/inventory_page_view_provider';

export function InventoryPage() {
  const { query } = useInventoryParams('/');
  const inventoryRoute = useInventoryRouter();

  const { grouping: queryGroup } = query;
  const [grouping, setGrouping] = useState<string>(queryGroup ?? 'none');

  useEffect(() => {
    inventoryRoute.replace('/', {
      path: {},
      query: { ...query, grouping: grouping as 'none' | 'type' },
    });
    // Only run the effect on a change for `grouping`. Other deps cause this to refire too many times.
    // Probably a better way of doing this.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [grouping]);

  return (
    <InventoryPageViewContextProvider grouping={grouping} setGrouping={setGrouping}>
      {grouping === 'none' ? <UngroupedInventoryPage /> : <GroupedInventoryPage />}
    </InventoryPageViewContextProvider>
  );
}
