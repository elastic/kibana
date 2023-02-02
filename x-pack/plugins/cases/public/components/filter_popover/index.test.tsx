/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { waitForEuiPopoverOpen } from '@elastic/eui/lib/test/rtl';

import type { AppMockRenderer } from '../../common/mock';
import { createAppMockRenderer } from '../../common/mock';

import { FilterPopover } from '.';
import userEvent from '@testing-library/user-event';

describe('FilterPopover ', () => {
  let appMockRender: AppMockRenderer;
  const onSelectedOptionsChanged = jest.fn();
  const tags: string[] = ['coke', 'pepsi'];

  beforeEach(() => {
    appMockRender = createAppMockRenderer();
    jest.clearAllMocks();
  });

  it('renders button label correctly', () => {
    const { getByTestId } = appMockRender.render(
      <FilterPopover
        buttonLabel={'Tags'}
        onSelectedOptionsChanged={onSelectedOptionsChanged}
        selectedOptions={['coke']}
        options={tags}
      />
    );

    expect(getByTestId('options-filter-popover-button-Tags')).toBeInTheDocument();
  });

  it('renders empty label correctly', async () => {
    const { getByTestId, getByText } = appMockRender.render(
      <FilterPopover
        buttonLabel={'Tags'}
        onSelectedOptionsChanged={onSelectedOptionsChanged}
        selectedOptions={[]}
        options={[]}
        optionsEmptyLabel="No options available"
      />
    );

    userEvent.click(getByTestId('options-filter-popover-button-Tags'));

    await waitForEuiPopoverOpen();

    expect(getByText('No options available')).toBeInTheDocument();
  });

  it('renders string type options correctly', async () => {
    const { getByTestId } = appMockRender.render(
      <FilterPopover
        buttonLabel={'Tags'}
        onSelectedOptionsChanged={onSelectedOptionsChanged}
        selectedOptions={['coke']}
        options={tags}
      />
    );

    userEvent.click(getByTestId('options-filter-popover-button-Tags'));

    await waitForEuiPopoverOpen();

    expect(getByTestId(`options-filter-popover-item-${tags[0]}`)).toBeInTheDocument();
    expect(getByTestId(`options-filter-popover-item-${tags[1]}`)).toBeInTheDocument();
  });

  it('should call onSelectionChange with selected option', async () => {
    const { getByTestId } = appMockRender.render(
      <FilterPopover
        buttonLabel={'Tags'}
        onSelectedOptionsChanged={onSelectedOptionsChanged}
        selectedOptions={[]}
        options={tags}
      />
    );

    userEvent.click(getByTestId('options-filter-popover-button-Tags'));

    await waitForEuiPopoverOpen();

    userEvent.click(getByTestId(`options-filter-popover-item-${tags[0]}`));

    expect(onSelectedOptionsChanged).toHaveBeenCalledWith([tags[0]]);
  });

  it('should call onSelectionChange with empty array when option is deselected', async () => {
    const { getByTestId } = appMockRender.render(
      <FilterPopover
        buttonLabel={'Tags'}
        onSelectedOptionsChanged={onSelectedOptionsChanged}
        selectedOptions={[tags[0]]}
        options={tags}
      />
    );

    userEvent.click(getByTestId('options-filter-popover-button-Tags'));

    await waitForEuiPopoverOpen();

    userEvent.click(getByTestId(`options-filter-popover-item-${tags[0]}`));

    expect(onSelectedOptionsChanged).toHaveBeenCalledWith([]);
  });
});
