/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { GroupSelector } from './group_selector';

import { InventoryComponentWrapperMock } from './mock/inventory_component_wrapper_mock';

describe('GroupSelector', () => {
  beforeEach(() => {
    render(
      <InventoryComponentWrapperMock>
        <GroupSelector />
      </InventoryComponentWrapperMock>
    );
  });
  it('Should default to Type', async () => {
    expect(await screen.findByText('Group entities by: Type')).toBeInTheDocument();
  });

  it.skip('Should change to None', async () => {
    const user = userEvent.setup();

    const selector = screen.getByText('Group entities by: Type');

    expect(selector).toBeInTheDocument();

    await user.click(selector);

    const noneOption = screen.getByTestId('panelUnified');

    expect(noneOption).toBeInTheDocument();

    await user.click(noneOption);

    expect(await screen.findByText('Group entities by: None')).toBeInTheDocument();
  });
});
