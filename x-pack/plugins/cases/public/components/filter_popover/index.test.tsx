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
import type { Solution } from '../all_cases/types';
import {
  OWNER_INFO,
  SECURITY_SOLUTION_OWNER,
  OBSERVABILITY_OWNER,
} from '../../../common/constants';

import { FilterPopover } from '.';
import userEvent from '@testing-library/user-event';

describe('FilterPopover ', () => {
  let appMockRender: AppMockRenderer;
  const onSelectedOptionsChanged = jest.fn();
  const tags: string[] = ['coke', 'pepsi'];
  const solutions: Solution[] = [
    {
      id: SECURITY_SOLUTION_OWNER,
      label: OWNER_INFO[SECURITY_SOLUTION_OWNER].label,
      iconType: OWNER_INFO[SECURITY_SOLUTION_OWNER].iconType,
    },
    {
      id: OBSERVABILITY_OWNER,
      label: OWNER_INFO[OBSERVABILITY_OWNER].label,
      iconType: OWNER_INFO[OBSERVABILITY_OWNER].iconType,
    },
  ];

  beforeEach(() => {
    appMockRender = createAppMockRenderer();
    jest.clearAllMocks();
  });

  it('renders button label correctly', () => {
    const result = appMockRender.render(
      <FilterPopover
        buttonLabel={'Tags'}
        onSelectedOptionsChanged={onSelectedOptionsChanged}
        selectedOptions={['coke']}
        options={tags}
      />
    );

    expect(result.getByTestId('options-filter-popover-button-Tags')).toBeInTheDocument();
  });

  it('renders empty label correctly', async () => {
    const result = appMockRender.render(
      <FilterPopover
        buttonLabel={'Tags'}
        onSelectedOptionsChanged={onSelectedOptionsChanged}
        selectedOptions={[]}
        options={[]}
        optionsEmptyLabel="No options available"
      />
    );

    userEvent.click(result.getByTestId('options-filter-popover-button-Tags'));

    await waitForEuiPopoverOpen();

    expect(result.getByText('No options available')).toBeInTheDocument();
  });

  it('renders string type options correctly', async () => {
    const result = appMockRender.render(
      <FilterPopover
        buttonLabel={'Tags'}
        onSelectedOptionsChanged={onSelectedOptionsChanged}
        selectedOptions={['coke']}
        options={tags}
      />
    );

    userEvent.click(result.getByTestId('options-filter-popover-button-Tags'));

    await waitForEuiPopoverOpen();

    expect(result.getByTestId(`options-filter-popover-item-${tags[0]}`)).toBeInTheDocument();
    expect(result.getByTestId(`options-filter-popover-item-${tags[1]}`)).toBeInTheDocument();
  });

  it('renders Solution type options correctly', async () => {
    const result = appMockRender.render(
      <FilterPopover
        buttonLabel={'Solutions'}
        onSelectedOptionsChanged={onSelectedOptionsChanged}
        selectedOptions={[]}
        options={solutions}
      />
    );

    expect(result.getByTestId('options-filter-popover-button-Solutions')).toBeInTheDocument();

    userEvent.click(result.getByTestId('options-filter-popover-button-Solutions'));

    await waitForEuiPopoverOpen();

    expect(
      result.getByTestId(`options-filter-popover-item-${solutions[0].id}`)
    ).toBeInTheDocument();
    expect(
      result.getByTestId(`options-filter-popover-item-${solutions[0].id}`)
    ).toBeInTheDocument();
  });

  it('should call onSelectionChange with selected option', async () => {
    const result = appMockRender.render(
      <FilterPopover
        buttonLabel={'Tags'}
        onSelectedOptionsChanged={onSelectedOptionsChanged}
        selectedOptions={[]}
        options={tags}
      />
    );

    userEvent.click(result.getByTestId('options-filter-popover-button-Tags'));

    await waitForEuiPopoverOpen();

    userEvent.click(result.getByTestId(`options-filter-popover-item-${tags[0]}`));

    expect(onSelectedOptionsChanged).toHaveBeenCalledWith([tags[0]]);
  });

  it('should call onSelectionChange with empty array when option is deselected', async () => {
    const result = appMockRender.render(
      <FilterPopover
        buttonLabel={'Tags'}
        onSelectedOptionsChanged={onSelectedOptionsChanged}
        selectedOptions={[tags[0]]}
        options={tags}
      />
    );

    userEvent.click(result.getByTestId('options-filter-popover-button-Tags'));

    await waitForEuiPopoverOpen();

    userEvent.click(result.getByTestId(`options-filter-popover-item-${tags[0]}`));

    expect(onSelectedOptionsChanged).toHaveBeenCalledWith([]);
  });

  it('should call onSelectionChange with selected solution id', async () => {
    const result = appMockRender.render(
      <FilterPopover
        buttonLabel={'Solutions'}
        onSelectedOptionsChanged={onSelectedOptionsChanged}
        selectedOptions={[]}
        options={solutions}
      />
    );

    userEvent.click(result.getByTestId('options-filter-popover-button-Solutions'));

    await waitForEuiPopoverOpen();

    userEvent.click(result.getByTestId(`options-filter-popover-item-${solutions[0].id}`));

    expect(onSelectedOptionsChanged).toHaveBeenCalledWith([solutions[0].id]);
  });

  it('should call onSelectionChange with empty array when solution option is deselected', async () => {
    const result = appMockRender.render(
      <FilterPopover
        buttonLabel={'Solutions'}
        onSelectedOptionsChanged={onSelectedOptionsChanged}
        selectedOptions={[solutions[1].id]}
        options={solutions}
      />
    );

    userEvent.click(result.getByTestId('options-filter-popover-button-Solutions'));

    await waitForEuiPopoverOpen();

    userEvent.click(result.getByTestId(`options-filter-popover-item-${solutions[1].id}`));

    expect(onSelectedOptionsChanged).toHaveBeenCalledWith([]);
  });
});
