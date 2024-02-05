/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { getPersistentControlsHook } from './use_persistent_controls';
import { TableId } from '@kbn/securitysolution-data-table';
import { renderHook } from '@testing-library/react-hooks';
import { render, fireEvent } from '@testing-library/react';
import { createMockStore, mockGlobalState, TestProviders } from '../../../common/mock';
import { useSourcererDataView } from '../../../common/containers/sourcerer';
import { useDeepEqualSelector, useShallowEqualSelector } from '../../../common/hooks/use_selector';
import { useKibana as mockUseKibana } from '../../../common/lib/kibana/__mocks__';
import { createTelemetryServiceMock } from '../../../common/lib/telemetry/telemetry_service.mock';

const mockDispatch = jest.fn();
const mockedUseKibana = mockUseKibana();
const mockedTelemetry = createTelemetryServiceMock();
jest.mock('react-redux', () => {
  const original = jest.requireActual('react-redux');
  return {
    ...original,
    useDispatch: () => mockDispatch,
  };
});
jest.mock('../../../common/containers/sourcerer');
jest.mock('../../../common/hooks/use_selector');
jest.mock('../../../common/lib/kibana', () => {
  const original = jest.requireActual('../../../common/lib/kibana');

  return {
    ...original,
    useKibana: () => ({
      ...mockedUseKibana,
      services: {
        ...mockedUseKibana.services,
        telemetry: mockedTelemetry,
      },
    }),
  };
});

const sourcererDataView = {
  indicesExist: true,
  loading: false,
  indexPattern: {
    fields: [],
  },
  browserFields: {},
};
const mockOptions = [
  { label: 'ruleName', key: 'kibana.alert.rule.name' },
  { label: 'userName', key: 'user.name' },
  { label: 'hostName', key: 'host.name' },
  { label: 'sourceIP', key: 'source.ip' },
];
const tableId = TableId.test;

const groups = {
  [tableId]: { options: mockOptions, activeGroups: ['kibana.alert.rule.name'] },
};

describe('usePersistentControls', () => {
  beforeEach(() => {
    (useDeepEqualSelector as jest.Mock).mockImplementation(() => groups[tableId]);
    (useShallowEqualSelector as jest.Mock).mockReturnValue({
      showOnlyThreatIndicatorAlerts: false,
      showBuildBlockAlerts: false,
    });
    jest.clearAllMocks();
    (useSourcererDataView as jest.Mock).mockReturnValue({
      ...sourcererDataView,
      selectedPatterns: ['myFakebeat-*'],
    });
  });

  afterEach(() => {
    (useDeepEqualSelector as jest.Mock).mockClear();
  });

  test('Should render the group selector component and allow the user to select a grouping field', () => {
    const store = createMockStore({
      ...mockGlobalState,
      groups,
    });
    const usePersistentControls = getPersistentControlsHook(tableId);
    const { result } = renderHook(() => usePersistentControls(), {
      wrapper: ({ children }) => <TestProviders store={store}>{children}</TestProviders>,
    });

    const groupSelector = result.current.right.props.additionalMenuOptions[0];
    const { getByTestId } = render(<TestProviders store={store}>{groupSelector}</TestProviders>);

    fireEvent.click(getByTestId('group-selector-dropdown'));
    fireEvent.click(getByTestId('panel-user.name'));
    expect(mockDispatch.mock.calls[0][0].payload).toEqual({
      activeGroups: ['user.name'],
      tableId,
    });
  });
});
