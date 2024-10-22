/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { GroupedInventory } from '.';
import { InventoryComponentWrapperMock } from './mock/inventory_component_wrapper_mock';

describe('InventoryPage', () => {
  it('renders grouped by default', () => {
    render(
      <InventoryComponentWrapperMock>
        <GroupedInventory />
      </InventoryComponentWrapperMock>
    );
    screen.debug();
  });
});
