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
  const openFilter = async (filterName: string) => {
    userEvent.click(screen.getByRole('button', { name: filterName }));
    return waitForEuiPopoverOpen();
  };

  it('should render the amount of options available', async () => {
    const onChange = jest.fn();
    const props = {
      id: 'tags' as keyof FilterOptions,
      buttonLabel: 'Tags',
      options: ['tag a', 'tag b', 'tag c', 'tag d'],
      onChange,
    };

    render(<MultiSelectFilter {...props} />);

    await openFilter('Tags');

    expect(screen.getByText('4 options')).toBeInTheDocument();
  });

  it('should not show warning message when one of the tags deselected after reaching the limit', async () => {
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

    await openFilter('Tags');

    expect(screen.getByText('Limit reached')).toBeInTheDocument();

    userEvent.click(screen.getByRole('option', { name: 'tag a' }));

    expect(onChange).toHaveBeenCalledWith({ filterId: 'tags', options: [] });
    rerender(<MultiSelectFilter {...props} selectedOptions={[]} />);

    expect(screen.queryByText('Limit reached')).not.toBeInTheDocument();
  });

  it('should show warning message when one of the tags deselected before reaching the limit', async () => {
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

    await openFilter('Tags');

    expect(screen.queryByText('Limit reached')).not.toBeInTheDocument();

    userEvent.click(screen.getByRole('option', { name: 'tag b' }));

    expect(onChange).toHaveBeenCalledWith({ filterId: 'tags', options: ['tag a', 'tag b'] });
    rerender(<MultiSelectFilter {...props} selectedOptions={['tag a', 'tag b']} />);

    expect(screen.getByText('Limit reached')).toBeInTheDocument();
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
});
