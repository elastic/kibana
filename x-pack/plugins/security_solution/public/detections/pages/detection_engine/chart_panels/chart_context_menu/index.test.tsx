/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { fireEvent, render, screen } from '@testing-library/react';
import { waitForEuiPopoverOpen } from '@elastic/eui/lib/test/rtl';
import React from 'react';

import { RESET_GROUP_BY_FIELDS } from '../../../../../common/components/chart_settings_popover/configurations/default/translations';
import { CHART_SETTINGS_POPOVER_ARIA_LABEL } from '../../../../../common/components/chart_settings_popover/translations';
import { INSPECT } from '../../../../../common/components/inspect/translations';
import {
  DEFAULT_STACK_BY_FIELD,
  DEFAULT_STACK_BY_FIELD1,
} from '../../../../components/alerts_kpis/common/config';
import { TestProviders } from '../../../../../common/mock';
import { ChartContextMenu } from '.';

describe('ChartContextMenu', () => {
  const queryId = 'abcd';
  beforeEach(() => jest.resetAllMocks());

  test('it renders the chart context menu button', () => {
    render(
      <TestProviders>
        <ChartContextMenu
          defaultStackByField={DEFAULT_STACK_BY_FIELD}
          defaultStackByField1={DEFAULT_STACK_BY_FIELD1}
          queryId={queryId}
          setStackBy={jest.fn()}
          setStackByField1={jest.fn()}
        />
      </TestProviders>
    );

    expect(
      screen.getByRole('button', { name: CHART_SETTINGS_POPOVER_ARIA_LABEL })
    ).toBeInTheDocument();
  });

  test('it renders the Inspect menu item', async () => {
    render(
      <TestProviders>
        <ChartContextMenu
          defaultStackByField={DEFAULT_STACK_BY_FIELD}
          defaultStackByField1={DEFAULT_STACK_BY_FIELD1}
          queryId={queryId}
          setStackBy={jest.fn()}
          setStackByField1={jest.fn()}
        />
      </TestProviders>
    );

    const menuButton = screen.getByRole('button', { name: CHART_SETTINGS_POPOVER_ARIA_LABEL });
    menuButton.click();
    await waitForEuiPopoverOpen();

    expect(screen.getByRole('button', { name: INSPECT })).toBeInTheDocument();
  });

  test('it invokes `setStackBy` and `setStackByField1` when the Reset group by fields menu item selected', async () => {
    const setStackBy = jest.fn();
    const setStackByField1 = jest.fn();

    render(
      <TestProviders>
        <ChartContextMenu
          defaultStackByField={DEFAULT_STACK_BY_FIELD}
          defaultStackByField1={DEFAULT_STACK_BY_FIELD1}
          queryId={queryId}
          setStackBy={setStackBy}
          setStackByField1={setStackByField1}
        />
      </TestProviders>
    );

    const menuButton = screen.getByRole('button', { name: CHART_SETTINGS_POPOVER_ARIA_LABEL });
    menuButton.click();
    await waitForEuiPopoverOpen();

    const resetMenuItem = screen.getByRole('button', { name: RESET_GROUP_BY_FIELDS });
    resetMenuItem.click();

    expect(setStackBy).toBeCalledWith('kibana.alert.rule.name');
    expect(setStackByField1).toBeCalledWith('host.name');
  });

  test('it invokes `onReset` when the `Reset group by fields` menu item clicked', async () => {
    const onReset = jest.fn();

    render(
      <TestProviders>
        <ChartContextMenu
          defaultStackByField={DEFAULT_STACK_BY_FIELD}
          defaultStackByField1={DEFAULT_STACK_BY_FIELD1}
          queryId={queryId}
          onReset={onReset}
          setStackBy={jest.fn()}
          setStackByField1={jest.fn()}
        />
      </TestProviders>
    );

    const menuButton = screen.getByRole('button', { name: CHART_SETTINGS_POPOVER_ARIA_LABEL });
    fireEvent.click(menuButton);
    await waitForEuiPopoverOpen();

    const resetMenuItem = screen.getByRole('button', { name: RESET_GROUP_BY_FIELDS });
    fireEvent.click(resetMenuItem);

    expect(onReset).toBeCalled();
  });
});
