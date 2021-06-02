/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, act } from '@testing-library/react';

import { createTestRendererMock } from '../../mock';

import { HostsInput } from './hosts_input';

function renderInput(value = ['http://host1.com']) {
  const renderer = createTestRendererMock();
  const mockOnChange = jest.fn();

  const utils = renderer.render(
    <HostsInput
      value={value}
      label="HOST LABEL"
      helpText="HELP TEXT"
      id="ID"
      onChange={mockOnChange}
    />
  );

  return { utils, mockOnChange };
}

test('it should allow to add a new host', async () => {
  const { utils, mockOnChange } = renderInput();

  const addRowEl = await utils.findByText('Add row');
  fireEvent.click(addRowEl);
  expect(mockOnChange).toHaveBeenCalledWith(['http://host1.com', '']);
});

test('it should allow to remove an host', async () => {
  const { utils, mockOnChange } = renderInput(['http://host1.com', 'http://host2.com']);

  await act(async () => {
    const deleteRowEl = await utils.container.querySelector('[aria-label="Delete host"]');
    if (!deleteRowEl) {
      throw new Error('Delete host button not found');
    }
    fireEvent.click(deleteRowEl);
  });

  expect(mockOnChange).toHaveBeenCalledWith(['http://host2.com']);
});

test('it should allow to update existing host with single host', async () => {
  const { utils, mockOnChange } = renderInput(['http://host1.com']);

  const inputEl = await utils.findByDisplayValue('http://host1.com');
  fireEvent.change(inputEl, { target: { value: 'http://newhost.com' } });
  expect(mockOnChange).toHaveBeenCalledWith(['http://newhost.com']);
});

test('it should allow to update existing host with multiple hosts', async () => {
  const { utils, mockOnChange } = renderInput(['http://host1.com', 'http://host2.com']);

  const inputEl = await utils.findByDisplayValue('http://host1.com');
  fireEvent.change(inputEl, { target: { value: 'http://newhost.com' } });
  expect(mockOnChange).toHaveBeenCalledWith(['http://newhost.com', 'http://host2.com']);
});

test('it should render an input if there is not hosts', async () => {
  const { utils, mockOnChange } = renderInput([]);

  const inputEl = await utils.findByDisplayValue('');
  expect(inputEl).toBeDefined();
  fireEvent.change(inputEl, { target: { value: 'http://newhost.com' } });
  expect(mockOnChange).toHaveBeenCalledWith(['http://newhost.com']);
});
