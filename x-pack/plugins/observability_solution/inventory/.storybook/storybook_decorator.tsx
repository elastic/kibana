/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { ComponentType, useMemo } from 'react';
import { InventoryContextProvider } from '../public/components/inventory_context_provider';
import { getMockInventoryContext } from './get_mock_inventory_context';

export function KibanaReactStorybookDecorator(Story: ComponentType) {
  const context = useMemo(() => getMockInventoryContext(), []);
  return (
    <InventoryContextProvider context={context}>
      <Story />
    </InventoryContextProvider>
  );
}
