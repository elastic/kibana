/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { MultiSelectFilter } from './multi_select_filter';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { waitForEuiPopoverOpen } from '@elastic/eui/lib/test/rtl';
import type { FilterOptions } from '../../../common/ui/types';

describe('multi select filter', () => {
  it('should render the amount of options available', async () => {
    const onChange = jest.fn();
    const props = {
      id: 'tags' as keyof FilterOptions,
      buttonLabel: 'Tags',
      options: ['tag a', 'tag b', 'tag c', 'tag d'],
      onChange,
    };

    render(<MultiSelectFilter {...props} />);

    userEvent.click(screen.getByRole('button', { name: 'Tags' }));
    await waitForEuiPopoverOpen();

    expect(screen.getByText('4 options')).toBeInTheDocument();
  });

  it('hides the limit reached warning when a selected tag is removed', async () => {
    const onChange = jest.fn();
    const props = {
      id: 'tags' as keyof FilterOptions,
      buttonLabel: 'Tags',
      options: ['tag a', 'tag b'],
      onChange,
      selectedOptions: ['tag a'],
      limit: 1,
      limitReachedMessage: 'Limit reached',
    };

    const { rerender } = render(<MultiSelectFilter {...props} />);

    userEvent.click(screen.getByRole('button', { name: 'Tags' }));
    await waitForEuiPopoverOpen();

    expect(screen.getByText('Limit reached')).toBeInTheDocument();

    userEvent.click(screen.getByRole('option', { name: 'tag a' }));

    expect(onChange).toHaveBeenCalledWith({ filterId: 'tags', options: [] });
    rerender(<MultiSelectFilter {...props} selectedOptions={[]} />);

    expect(screen.queryByText('Limit reached')).not.toBeInTheDocument();
  });

  it('displays the limit reached warning when the maximum number of tags is selected', async () => {
    const onChange = jest.fn();
    const props = {
      id: 'tags' as keyof FilterOptions,
      buttonLabel: 'Tags',
      options: ['tag a', 'tag b'],
      onChange,
      selectedOptions: ['tag a'],
      limit: 2,
      limitReachedMessage: 'Limit reached',
    };

    const { rerender } = render(<MultiSelectFilter {...props} />);

    userEvent.click(screen.getByRole('button', { name: 'Tags' }));
    await waitForEuiPopoverOpen();

    expect(screen.queryByText('Limit reached')).not.toBeInTheDocument();

    userEvent.click(screen.getByRole('option', { name: 'tag b' }));

    expect(onChange).toHaveBeenCalledWith({ filterId: 'tags', options: ['tag a', 'tag b'] });
    rerender(<MultiSelectFilter {...props} selectedOptions={['tag a', 'tag b']} />);

    expect(screen.getByText('Limit reached')).toBeInTheDocument();
  });

  it('should not call onChange when the limit has been reached', async () => {
    const onChange = jest.fn();
    const props = {
      id: 'tags' as keyof FilterOptions,
      buttonLabel: 'Tags',
      options: ['tag a', 'tag b'],
      onChange,
      selectedOptions: ['tag a'],
      limit: 1,
      limitReachedMessage: 'Limit reached',
    };

    render(<MultiSelectFilter {...props} />);

    userEvent.click(screen.getByRole('button', { name: 'Tags' }));
    await waitForEuiPopoverOpen();

    expect(screen.getByText('Limit reached')).toBeInTheDocument();

    userEvent.click(screen.getByRole('option', { name: 'tag b' }));

    expect(onChange).not.toHaveBeenCalled();
  });

  it('should remove selected option if it suddenly disappeared from the list', async () => {
    const onChange = jest.fn();
    const props = {
      id: 'tags' as keyof FilterOptions,
      buttonLabel: 'Tags',
      options: ['tag a', 'tag b'],
      onChange,
      selectedOptions: ['tag b'],
    };

    const { rerender } = render(<MultiSelectFilter {...props} />);
    rerender(<MultiSelectFilter {...props} options={['tag a']} />);
    expect(onChange).toHaveBeenCalledWith({ filterId: 'tags', options: [] });
  });

  it('activates custom renderOption when set', async () => {
    const TEST_ID = 'test-render-option-id';
    const onChange = jest.fn();
    const renderOption = () => <div data-test-subj={TEST_ID} />;
    const props = {
      id: 'tags' as keyof FilterOptions,
      buttonLabel: 'Tags',
      options: ['tag a', 'tag b'],
      onChange,
      renderOption,
    };

    render(<MultiSelectFilter {...props} />);
    userEvent.click(screen.getByRole('button', { name: 'Tags' }));
    await waitForEuiPopoverOpen();
    expect(screen.getAllByTestId(TEST_ID).length).toBe(2);
  });
});
