/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react';
import type { Filter } from '@kbn/es-query';
import useResizeObserver from 'use-resize-observer/polyfilled';

import '../../../common/mock/match_media';
import {
  createSecuritySolutionStorageMock,
  kibanaObservable,
  mockGlobalState,
  SUB_PLUGINS_REDUCER,
  TestProviders,
} from '../../../common/mock';
import type { AlertsTableComponentProps } from './alerts_grouping';
import { GroupedAlertsTableComponent } from './alerts_grouping';
import { TableId } from '../../../../common/types';
import { useSourcererDataView } from '../../../common/containers/sourcerer';
import type { UseFieldBrowserOptionsProps } from '../../../timelines/components/fields_browser';
import { createStore } from '../../../common/store';
import { useKibana as mockUseKibana } from '../../../common/lib/kibana/__mocks__';
import { createTelemetryServiceMock } from '../../../common/lib/telemetry/telemetry_service.mock';
import { useQueryAlerts } from '../../containers/detection_engine/alerts/use_query';
import { groupingSearchResponse } from './grouping_settings/mock';

jest.mock('../../containers/detection_engine/alerts/use_query');
jest.mock('../../../common/containers/sourcerer');
jest.mock('../../../common/utils/normalize_time_range');
jest.mock('../../../common/containers/use_global_time', () => ({
  useGlobalTime: jest.fn().mockReturnValue({
    from: '2020-07-07T08:20:18.966Z',
    isInitializing: false,
    to: '2020-07-08T08:20:18.966Z',
    setQuery: jest.fn(),
  }),
}));

jest.mock('./grouping_settings', () => ({
  getAlertsGroupingQuery: jest.fn(),
  getDefaultGroupingOptions: () => [
    { label: 'ruleName', key: 'kibana.alert.rule.name' },
    { label: 'userName', key: 'user.name' },
    { label: 'hostName', key: 'host.name' },
    { label: 'sourceIP', key: 'source.ip' },
  ],
  getSelectedGroupBadgeMetrics: jest.fn(),
  getSelectedGroupButtonContent: jest.fn(),
  getSelectedGroupCustomMetrics: jest.fn(),
  useGroupTakeActionsItems: jest.fn(),
}));

const mockDispatch = jest.fn();
jest.mock('react-redux', () => {
  const original = jest.requireActual('react-redux');
  return {
    ...original,
    useDispatch: () => mockDispatch,
  };
});

const mockUseFieldBrowserOptions = jest.fn();
jest.mock('../../../timelines/components/fields_browser', () => ({
  useFieldBrowserOptions: (props: UseFieldBrowserOptionsProps) => mockUseFieldBrowserOptions(props),
}));

const mockUseResizeObserver: jest.Mock = useResizeObserver as jest.Mock;
jest.mock('use-resize-observer/polyfilled');
mockUseResizeObserver.mockImplementation(() => ({}));
const mockedUseKibana = mockUseKibana();
const mockedTelemetry = createTelemetryServiceMock();
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

jest.mock('./timeline_actions/use_add_bulk_to_timeline', () => ({
  useAddBulkToTimelineAction: jest.fn(() => {}),
}));

const sourcererDataView = {
  indicesExist: true,
  loading: false,
  indexPattern: {
    fields: [],
  },
  browserFields: {},
};
const renderChildComponent = (groupingFilters: Filter[]) => <p data-test-subj="alerts-table" />;

const testProps: AlertsTableComponentProps = {
  defaultFilters: [],
  from: '2020-07-07T08:20:18.966Z',
  globalFilters: [],
  globalQuery: {
    query: 'query',
    language: 'language',
  },
  hasIndexMaintenance: true,
  hasIndexWrite: true,
  loading: false,
  renderChildComponent,
  runtimeMappings: {},
  signalIndexName: 'test',
  tableId: TableId.test,
  to: '2020-07-08T08:20:18.966Z',
};

const mockUseQueryAlerts = useQueryAlerts as jest.Mock;

describe('GroupedAlertsTable', () => {
  const { storage } = createSecuritySolutionStorageMock();
  let store: ReturnType<typeof createStore>;
  beforeEach(() => {
    jest.clearAllMocks();
    store = createStore(mockGlobalState, SUB_PLUGINS_REDUCER, kibanaObservable, storage);
    (useSourcererDataView as jest.Mock).mockReturnValue({
      ...sourcererDataView,
      selectedPatterns: ['myFakebeat-*'],
    });
    mockUseQueryAlerts.mockReturnValue({
      loading: false,
      data: groupingSearchResponse,
      setQuery: () => {},
      response: '',
      request: '',
      refetch: () => {},
    });
  });

  it('calls the proper initial dispatch actions for groups', () => {
    render(
      <TestProviders store={store}>
        <GroupedAlertsTableComponent {...testProps} />
      </TestProviders>
    );
    expect(mockDispatch).toHaveBeenCalledTimes(1);
    expect(mockDispatch.mock.calls[0][0].type).toEqual(
      'x-pack/security_solution/groups/UPDATE_GROUP_SELECTOR'
    );
  });

  it('renders empty grouping table when group is selected without data', async () => {
    mockUseQueryAlerts.mockReturnValue({
      loading: false,
      data: {},
      setQuery: () => {},
      response: '',
      request: '',
      refetch: () => {},
    });
    const { getByTestId, queryByTestId } = render(
      <TestProviders store={store}>
        <GroupedAlertsTableComponent {...testProps} />
      </TestProviders>
    );

    expect(queryByTestId('empty-results-panel')).not.toBeInTheDocument();
    expect(getByTestId('alerts-table')).toBeInTheDocument();
    const { getByTestId: getByTestIdGroupSelector } = render(
      mockDispatch.mock.calls[0][0].payload.groupSelector
    );

    await waitFor(() => {
      fireEvent.click(getByTestIdGroupSelector('group-selector-dropdown'));
      fireEvent.click(getByTestIdGroupSelector('panel-host.name'));
    });
    expect(queryByTestId('alerts-table')).not.toBeInTheDocument();
    expect(getByTestId('empty-results-panel')).toBeInTheDocument();
  });
  it('renders grouping table when single group is selected', async () => {
    const { getByTestId, getAllByTestId } = render(
      <TestProviders store={store}>
        <GroupedAlertsTableComponent {...testProps} />
      </TestProviders>
    );
    fireEvent.click(getByTestId('group-selector-dropdown'));
    fireEvent.click(getByTestId('panel-kibana.alert.rule.name'));

    expect(getByTestId('unit-count')).toHaveTextContent('6,048 alerts');
    expect(getByTestId('group-count')).toHaveTextContent('32 groups');
    expect(getAllByTestId('grouping-accordion').length).toEqual(25);
  });

  it('resets pagination when selected group changes', async () => {
    const { getByTestId, getAllByTestId } = render(
      <TestProviders store={store}>
        <GroupedAlertsTableComponent {...testProps} />
      </TestProviders>
    );
    fireEvent.click(getByTestId('group-selector-dropdown'));
    fireEvent.click(getByTestId('panel-kibana.alert.rule.name'));
    expect(getByTestId('pagination-button-0').getAttribute('aria-current')).toEqual('true');
    expect(getByTestId('pagination-button-1').getAttribute('aria-current')).toEqual(null);
    fireEvent.click(getByTestId('pagination-button-1'));
    expect(getByTestId('pagination-button-1').getAttribute('aria-current')).toEqual('true');
    expect(getByTestId('pagination-button-0').getAttribute('aria-current')).toEqual(null);
    fireEvent.click(getAllByTestId('group-selector-dropdown')[0]);
    fireEvent.click(getAllByTestId('panel-user.name')[0]);
    expect(getByTestId('pagination-button-0').getAttribute('aria-current')).toEqual('true');
    expect(getByTestId('pagination-button-1').getAttribute('aria-current')).toEqual(null);
  });

  it('resets grouping pagination when global query updates', () => {
    const { getByTestId, getAllByTestId, rerender } = render(
      <TestProviders store={store}>
        <GroupedAlertsTableComponent {...testProps} />
      </TestProviders>
    );
    fireEvent.click(getByTestId('group-selector-dropdown'));
    fireEvent.click(getByTestId('panel-kibana.alert.rule.name'));
    expect(getByTestId('pagination-button-0').getAttribute('aria-current')).toEqual('true');
    expect(getByTestId('pagination-button-1').getAttribute('aria-current')).toEqual(null);
    fireEvent.click(getByTestId('pagination-button-1'));
    expect(getByTestId('pagination-button-1').getAttribute('aria-current')).toEqual('true');
    expect(getByTestId('pagination-button-0').getAttribute('aria-current')).toEqual(null);
    fireEvent.click(getAllByTestId('group-selector-dropdown')[0]);
    fireEvent.click(getAllByTestId('panel-user.name')[0]);
    rerender(
      <TestProviders store={store}>
        <GroupedAlertsTableComponent
          {...{ ...testProps, globalQuery: { query: 'updated', language: 'language' } }}
        />
      </TestProviders>
    );
    expect(getByTestId('pagination-button-0').getAttribute('aria-current')).toEqual('true');
    expect(getByTestId('pagination-button-1').getAttribute('aria-current')).toEqual(null);
  });
});
