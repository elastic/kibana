/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, act } from '@testing-library/react';

import { createFleetTestRendererMock } from '../../../../../../mock';

import { MultiRowInput } from '.';

function renderInput(
  value = ['http://host1.com'],
  errors: Array<{ message: string; index?: number }> = [],
  mockOnChange: (...args: any[]) => void = jest.fn()
) {
  const renderer = createFleetTestRendererMock();

  const utils = renderer.render(
    <MultiRowInput
      value={value}
      errors={errors}
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
    const deleteRowEl = await utils.container.querySelector('[aria-label="Delete row"]');
    if (!deleteRowEl) {
      throw new Error('Delete row button not found');
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

test('Should display single indexed error message', async () => {
  const { utils } = renderInput(['bad host'], [{ message: 'Invalid URL', index: 0 }]);
  const inputEl = await utils.findByText('Invalid URL');
  expect(inputEl).toBeDefined();
});

test('Should display errors in order', async () => {
  const { utils } = renderInput(
    ['bad host 1', 'bad host 2', 'bad host 3'],
    [
      { message: 'Error 1', index: 0 },
      { message: 'Error 2', index: 1 },
      { message: 'Error 3', index: 2 },
    ]
  );
  await act(async () => {
    const errors = await utils.queryAllByText(/Error [1-3]/);
    expect(errors[0]).toHaveTextContent('Error 1');
    expect(errors[1]).toHaveTextContent('Error 2');
    expect(errors[2]).toHaveTextContent('Error 3');
  });
});

test('Should remove error when item deleted', async () => {
  const mockOnChange = jest.fn();
  const errors = [
    { message: 'Error 1', index: 0 },
    { message: 'Error 2', index: 1 },
    { message: 'Error 3', index: 2 },
  ];

  const { utils } = renderInput(['bad host 1', 'bad host 2', 'bad host 3'], errors, mockOnChange);

  mockOnChange.mockImplementation((newValue) => {
    utils.rerender(
      <MultiRowInput
        value={newValue}
        errors={errors}
        label="HOST LABEL"
        helpText="HELP TEXT"
        id="ID"
        onChange={mockOnChange}
      />
    );
  });

  await act(async () => {
    const deleteRowButtons = await utils.container.querySelectorAll('[aria-label="Delete row"]');
    if (deleteRowButtons.length !== 3) {
      throw new Error('Delete row buttons not found');
    }

    fireEvent.click(deleteRowButtons[1]);
    expect(mockOnChange).toHaveBeenCalled();

    const renderedErrors = await utils.queryAllByText(/Error [1-3]/);
    expect(renderedErrors).toHaveLength(2);
    expect(renderedErrors[0]).toHaveTextContent('Error 1');
    expect(renderedErrors[1]).toHaveTextContent('Error 3');
  });
});
