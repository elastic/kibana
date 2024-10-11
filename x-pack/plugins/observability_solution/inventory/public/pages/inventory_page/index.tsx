/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useState } from 'react';
import { UngroupedInventoryPage } from '../../components/grouped_inventory/ungrouped';
import { GroupedInventoryPage } from '../../components/grouped_inventory/grouped';

export function InventoryPage() {
  const [grouping, setGrouping] = useState('none');
  return grouping === 'none' ? (
    <UngroupedInventoryPage groupSelected={grouping} setGroupSelected={setGrouping} />
  ) : (
    <GroupedInventoryPage groupSelected={grouping} setGroupSelected={setGrouping} />
  );
}
