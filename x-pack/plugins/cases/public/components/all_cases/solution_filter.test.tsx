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
import type { Solution } from './types';
import {
  OWNER_INFO,
  SECURITY_SOLUTION_OWNER,
  OBSERVABILITY_OWNER,
} from '../../../common/constants';

import { SolutionFilter } from './solution_filter';
import userEvent from '@testing-library/user-event';

describe('SolutionFilter ', () => {
  let appMockRender: AppMockRenderer;
  const onSelectedOptionsChanged = jest.fn();
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

  it('renders button correctly', () => {
    const { getByTestId } = appMockRender.render(
      <SolutionFilter
        onSelectedOptionsChanged={onSelectedOptionsChanged}
        selectedOptions={[]}
        options={solutions}
      />
    );

    expect(getByTestId('solution-filter-popover-button')).toBeInTheDocument();
  });

  it('renders empty label correctly', async () => {
    const { getByTestId, getByText } = appMockRender.render(
      <SolutionFilter
        onSelectedOptionsChanged={onSelectedOptionsChanged}
        selectedOptions={[]}
        options={[]}
        optionsEmptyLabel="No options available"
      />
    );

    userEvent.click(getByTestId('solution-filter-popover-button'));

    await waitForEuiPopoverOpen();

    expect(getByText('No options available')).toBeInTheDocument();
  });

  it('renders options correctly', async () => {
    const { getByTestId } = appMockRender.render(
      <SolutionFilter
        onSelectedOptionsChanged={onSelectedOptionsChanged}
        selectedOptions={[]}
        options={solutions}
      />
    );

    expect(getByTestId('solution-filter-popover-button')).toBeInTheDocument();

    userEvent.click(getByTestId('solution-filter-popover-button'));

    await waitForEuiPopoverOpen();

    expect(getByTestId(`solution-filter-popover-item-${solutions[0].id}`)).toBeInTheDocument();
    expect(getByTestId(`solution-filter-popover-item-${solutions[0].id}`)).toBeInTheDocument();
  });

  it('should call onSelectionChange with selected solution id', async () => {
    const { getByTestId } = appMockRender.render(
      <SolutionFilter
        onSelectedOptionsChanged={onSelectedOptionsChanged}
        selectedOptions={[]}
        options={solutions}
      />
    );

    userEvent.click(getByTestId('solution-filter-popover-button'));

    await waitForEuiPopoverOpen();

    userEvent.click(getByTestId(`solution-filter-popover-item-${solutions[0].id}`));

    expect(onSelectedOptionsChanged).toHaveBeenCalledWith([solutions[0].id]);
  });

  it('should call onSelectionChange with empty array when solution option is deselected', async () => {
    const { getByTestId } = appMockRender.render(
      <SolutionFilter
        onSelectedOptionsChanged={onSelectedOptionsChanged}
        selectedOptions={[solutions[1].id]}
        options={solutions}
      />
    );

    userEvent.click(getByTestId('solution-filter-popover-button'));

    await waitForEuiPopoverOpen();

    userEvent.click(getByTestId(`solution-filter-popover-item-${solutions[1].id}`));

    expect(onSelectedOptionsChanged).toHaveBeenCalledWith([]);
  });
});
