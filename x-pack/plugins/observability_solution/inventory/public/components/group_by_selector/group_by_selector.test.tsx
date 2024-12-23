/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render, screen } from '@testing-library/react';
import React from 'react';
import { GroupBySelector } from '.';
import { InventoryComponentWrapperMock } from '../entity_group_accordion/mock/inventory_component_wrapper_mock';

describe('GroupBySelector', () => {
  beforeEach(() => {
    render(
      <InventoryComponentWrapperMock>
        <GroupBySelector />
      </InventoryComponentWrapperMock>
    );
  });
  it('Should default to Type', async () => {
    expect(await screen.findByText('Group entities by: Type')).toBeInTheDocument();
  });
});
