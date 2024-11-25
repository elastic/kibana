/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { GroupedInventory } from '../../components/grouped_inventory';
import { UnifiedInventory } from '../../components/unified_inventory';
import { useInventoryParams } from '../../hooks/use_inventory_params';

export function InventoryPage() {
  const { query } = useInventoryParams('/');
  return query.view === 'unified' ? <UnifiedInventory /> : <GroupedInventory />;
}
