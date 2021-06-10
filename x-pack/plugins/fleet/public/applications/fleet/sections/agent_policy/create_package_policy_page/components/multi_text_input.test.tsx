/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, act } from '@testing-library/react';

import { createFleetTestRendererMock } from '../../../../../../mock';

import { MultiTextInput } from './multi_text_input';

function renderInput(value = ['value1']) {
  const renderer = createFleetTestRendererMock();
  const mockOnChange = jest.fn();

  const utils = renderer.render(<MultiTextInput value={value} onChange={mockOnChange} />);

  return { utils, mockOnChange };
}

test('it should allow to add a new value', async () => {
  const { utils, mockOnChange } = renderInput();

  const addRowEl = await utils.findByText('Add row');
  fireEvent.click(addRowEl);

  expect(mockOnChange).toHaveBeenCalledWith(['value1']);

  const inputEl = await utils.findByDisplayValue('');
  expect(inputEl).toBeDefined();

  fireEvent.change(inputEl, { target: { value: 'value2' } });

  expect(mockOnChange).toHaveBeenCalledWith(['value1', 'value2']);
});

test('it should not show the delete button if there only one row', async () => {
  const { utils } = renderInput(['value1']);

  await act(async () => {
    const deleteRowEl = await utils.container.querySelector('[aria-label="Delete row"]');
    expect(deleteRowEl).toBeNull();
  });
});

test('it should allow to update  existing value', async () => {
  const { utils, mockOnChange } = renderInput(['value1', 'value2']);

  const inputEl = await utils.findByDisplayValue('value1');
  expect(inputEl).toBeDefined();

  fireEvent.change(inputEl, { target: { value: 'value1updated' } });

  expect(mockOnChange).toHaveBeenCalledWith(['value1updated', 'value2']);
});

test('it should allow to remove a row', async () => {
  const { utils, mockOnChange } = renderInput(['value1', 'value2']);

  await act(async () => {
    const deleteRowEl = await utils.container.querySelector('[aria-label="Delete row"]');
    if (!deleteRowEl) {
      throw new Error('Delete row button not found');
    }
    fireEvent.click(deleteRowEl);
  });

  expect(mockOnChange).toHaveBeenCalledWith(['value2']);
});
