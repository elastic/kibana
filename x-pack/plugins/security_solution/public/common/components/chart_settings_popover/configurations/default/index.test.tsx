/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react-hooks';
import React from 'react';

import {
  createSecuritySolutionStorageMock,
  kibanaObservable,
  mockGlobalState,
  SUB_PLUGINS_REDUCER,
  TestProviders,
} from '../../../../mock';
import type { State } from '../../../../store';
import { createStore } from '../../../../store';
import * as i18n from './translations';
import { useChartSettingsPopoverConfiguration } from '.';

const mockHandleClick = jest.fn();

jest.mock('../../../inspect/use_inspect', () => ({
  useInspect: () => ({ handleClick: mockHandleClick }),
}));

describe('useChartSettingsPopoverConfiguration', () => {
  const onResetStackByFields = jest.fn();
  const queryId = 'abcd';

  const state: State = mockGlobalState;
  const { storage } = createSecuritySolutionStorageMock();
  const store = createStore(state, SUB_PLUGINS_REDUCER, kibanaObservable, storage);
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <TestProviders store={store}>{children}</TestProviders>
  );

  beforeEach(() => jest.resetAllMocks());

  test('it returns the expected defaultInitialPanelId', () => {
    const { result } = renderHook(
      () => useChartSettingsPopoverConfiguration({ onResetStackByFields, queryId }),
      { wrapper }
    );

    expect(result.current.defaultInitialPanelId).toEqual('default-initial-panel');
  });

  test('it invokes handleClick when the Inspect menu item is clicked', () => {
    const { result } = renderHook(
      () => useChartSettingsPopoverConfiguration({ onResetStackByFields, queryId }),
      { wrapper }
    );

    (
      result.current.defaultMenuItems[0].items?.find((x) => x.name === i18n.INSPECT)
        ?.onClick as () => void
    )();

    expect(mockHandleClick).toBeCalled();
  });

  test('it invokes onResetStackByFields when the Reset menu item is clicked', () => {
    const { result } = renderHook(
      () => useChartSettingsPopoverConfiguration({ onResetStackByFields, queryId }),
      { wrapper }
    );

    (
      result.current.defaultMenuItems[0].items?.find((x) => x.name === i18n.RESET_GROUP_BY_FIELDS)
        ?.onClick as () => void
    )();

    expect(onResetStackByFields).toBeCalled();
  });
});
