/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render, screen } from '@testing-library/react';
import React from 'react';

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

    expect(screen.getByTestId('chartSettingsPopoverButton')).toBeInTheDocument();
  });

  test('it renders the Inspect menu item', () => {
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

    const menuButton = screen.getByTestId('chartSettingsPopoverButton');
    menuButton.click();

    expect(screen.getByTestId('inspectMenuItem')).toBeInTheDocument();
  });

  test('it invokes `setStackBy` and `setStackByField1` when the Reset group by fields menu item selected', () => {
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

    const menuButton = screen.getByTestId('chartSettingsPopoverButton');
    menuButton.click();

    const resetMenuItem = screen.getByTestId('resetGroupByFieldsMenuItem');
    resetMenuItem.click();

    expect(setStackBy).toBeCalledWith('kibana.alert.rule.name');
    expect(setStackByField1).toBeCalledWith('host.name');
  });
});
