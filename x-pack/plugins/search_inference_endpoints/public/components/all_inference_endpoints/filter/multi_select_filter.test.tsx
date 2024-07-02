/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react';
import { MultiSelectFilter, MultiSelectFilterOption } from './multi_select_filter';
import '@testing-library/jest-dom/extend-expect';

describe('MultiSelectFilter', () => {
  const options: MultiSelectFilterOption[] = [
    { key: '1', label: 'Option 1', checked: 'off' },
    { key: '2', label: 'Option 2', checked: 'on' },
    { key: '3', label: 'Option 3', checked: 'off' },
  ];

  it('should render the filter button with the provided label', () => {
    const { getByText } = render(
      <MultiSelectFilter
        id="testFilter"
        onChange={() => {}}
        options={options}
        buttonLabel="Filter Options"
      />
    );
    expect(getByText('Filter Options')).toBeInTheDocument();
  });

  it('should toggle the popover when the filter button is clicked', async () => {
    const { getByText, queryByText } = render(
      <MultiSelectFilter
        id="testFilter"
        onChange={() => {}}
        options={options}
        buttonLabel="Filter Options"
      />
    );
    fireEvent.click(getByText('Filter Options'));
    expect(queryByText('Option 1')).toBeInTheDocument();
    fireEvent.click(getByText('Filter Options'));
    await waitFor(() => {
      expect(queryByText('Option 1')).not.toBeInTheDocument();
    });
  });

  it('should call onChange with the correct parameters when an option is selected, toggling its checked state', () => {
    const onChangeMock = jest.fn();
    const { getByText } = render(
      <MultiSelectFilter
        id="testFilter"
        onChange={onChangeMock}
        options={options}
        selectedOptionKeys={['2']}
        buttonLabel="Filter Options"
      />
    );
    fireEvent.click(getByText('Filter Options'));
    fireEvent.click(getByText('Option 1'));
    expect(onChangeMock).toHaveBeenCalledWith({
      filterId: 'testFilter',
      selectedOptionKeys: ['1', '2'],
    });
  });
});
