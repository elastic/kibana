/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useMemo } from 'react';
import { DecoratorFn } from '@storybook/react';
import { InventoryContextProvider } from '../public/context/inventory_context_provider';
import { getMockInventoryContext } from './get_mock_inventory_context';

export const KibanaReactStorybookDecorator: DecoratorFn = (story) => {
  const context = useMemo(() => getMockInventoryContext(), []);
  return <InventoryContextProvider context={context}>{story()}</InventoryContextProvider>;
};
