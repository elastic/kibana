/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, within } from '@testing-library/react';
import type { Filter } from '@kbn/es-query';
import useResizeObserver from 'use-resize-observer/polyfilled';

import { createMockStore, mockGlobalState, TestProviders } from '../../../common/mock';
import type { AlertsTableComponentProps } from './alerts_grouping';
import { GroupedAlertsTable } from './alerts_grouping';
import { TableId } from '@kbn/securitysolution-data-table';
import { useSourcererDataView } from '../../../sourcerer/containers';
import type { UseFieldBrowserOptionsProps } from '../../../timelines/components/fields_browser';
import { useKibana as mockUseKibana } from '../../../common/lib/kibana/__mocks__';
import { createTelemetryServiceMock } from '../../../common/lib/telemetry/telemetry_service.mock';
import { useQueryAlerts } from '../../containers/detection_engine/alerts/use_query';
import { getQuery, groupingSearchResponse } from './grouping_settings/mock';
import { AlertsEventTypes } from '../../../common/lib/telemetry';

jest.mock('../../containers/detection_engine/alerts/use_query');
jest.mock('../../../sourcerer/containers');
jest.mock('../../../common/utils/normalize_time_range');
jest.mock('uuid', () => ({
  v4: jest.fn().mockReturnValue('test-uuid'),
}));

const mockDate = {
  from: '2020-07-07T08:20:18.966Z',
  to: '2020-07-08T08:20:18.966Z',
};

const mockUseGlobalTime = jest
  .fn()
  .mockReturnValue({ ...mockDate, setQuery: jest.fn(), deleteQuery: jest.fn() });

jest.mock('../../../common/containers/use_global_time', () => {
  return {
    useGlobalTime: (...props: unknown[]) => mockUseGlobalTime(...props),
  };
});

const mockOptions = [
  { label: 'ruleName', key: 'kibana.alert.rule.name' },
  { label: 'userName', key: 'user.name' },
  { label: 'hostName', key: 'host.name' },
  { label: 'sourceIP', key: 'source.ip' },
];

jest.mock('../../../common/utils/alerts', () => {
  const actual = jest.requireActual('../../../common/utils/alerts');

  return {
    ...actual,
    getDefaultGroupingOptions: () => mockOptions,
  };
});

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
        storage: {
          get: jest.fn().mockReturnValue([25, 25, 25]),
          set: jest.fn(),
        },
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
  ...mockDate,
  defaultFilters: [],
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
};

const mockUseQueryAlerts = useQueryAlerts as jest.Mock;
const mockQueryResponse = {
  loading: false,
  data: {},
  setQuery: () => {},
  response: '',
  request: '',
  refetch: () => {},
};

const getMockStorageState = (groups: string[] = ['none']) =>
  JSON.stringify({
    [testProps.tableId]: {
      activeGroups: groups,
      options: mockOptions,
    },
  });

describe('GroupedAlertsTable', () => {
  let store = createMockStore();

  beforeEach(() => {
    jest.clearAllMocks();
    store = createMockStore({
      ...mockGlobalState,
      groups: {
        [testProps.tableId]: { options: mockOptions, activeGroups: ['kibana.alert.rule.name'] },
      },
    });
    (useSourcererDataView as jest.Mock).mockReturnValue({
      ...sourcererDataView,
      selectedPatterns: ['myFakebeat-*'],
    });
    mockUseQueryAlerts.mockImplementation((i) => {
      if (i.skip) {
        return mockQueryResponse;
      }
      return {
        ...mockQueryResponse,
        data: groupingSearchResponse,
      };
    });
  });

  it('calls the proper initial dispatch actions for groups', () => {
    const { getByTestId, queryByTestId } = render(
      <TestProviders store={createMockStore()}>
        <GroupedAlertsTable {...testProps} />
      </TestProviders>
    );

    expect(queryByTestId('empty-results-panel')).not.toBeInTheDocument();
    expect(queryByTestId('group-selector-dropdown')).not.toBeInTheDocument();
    expect(getByTestId('alerts-table')).toBeInTheDocument();

    expect(mockDispatch).toHaveBeenCalledTimes(2);
    expect(mockDispatch.mock.calls[0][0].payload).toEqual({
      options: mockOptions,
      tableId: testProps.tableId,
    });
    expect(mockDispatch.mock.calls[1][0].payload).toEqual({
      activeGroups: ['none'],
      tableId: testProps.tableId,
    });
  });

  it('renders empty grouping table when group is selected without data', () => {
    mockUseQueryAlerts.mockReturnValue(mockQueryResponse);
    jest
      .spyOn(window.localStorage, 'getItem')
      .mockReturnValue(getMockStorageState(['kibana.alert.rule.name']));

    const { getByTestId, queryByTestId } = render(
      <TestProviders store={store}>
        <GroupedAlertsTable {...testProps} />
      </TestProviders>
    );
    expect(queryByTestId('alerts-table')).not.toBeInTheDocument();
    expect(getByTestId('empty-results-panel')).toBeInTheDocument();
  });

  it('renders grouping table in first accordion level when single group is selected', () => {
    jest
      .spyOn(window.localStorage, 'getItem')
      .mockReturnValue(getMockStorageState(['kibana.alert.rule.name']));

    const { getByTestId } = render(
      <TestProviders store={store}>
        <GroupedAlertsTable {...testProps} />
      </TestProviders>
    );

    fireEvent.click(within(getByTestId('level-0-group-0')).getByTestId('group-panel-toggle'));
    expect(within(getByTestId('level-0-group-0')).getByTestId('alerts-table')).toBeInTheDocument();
  });

  it('Query gets passed correctly', () => {
    jest
      .spyOn(window.localStorage, 'getItem')
      .mockReturnValue(getMockStorageState(['kibana.alert.rule.name']));

    render(
      <TestProviders store={store}>
        <GroupedAlertsTable {...testProps} />
      </TestProviders>
    );
    expect(mockUseQueryAlerts).toHaveBeenLastCalledWith({
      indexName: 'test',
      query: getQuery('kibana.alert.rule.name', 'SuperUniqueValue-test-uuid', mockDate),
      queryName: 'securitySolutionUI fetchAlerts grouping',
      skip: false,
    });
  });

  it('renders grouping table in second accordion level when 2 groups are selected', () => {
    jest
      .spyOn(window.localStorage, 'getItem')
      .mockReturnValue(getMockStorageState(['kibana.alert.rule.name', 'host.name']));
    store = createMockStore({
      ...mockGlobalState,
      groups: {
        [testProps.tableId]: {
          options: mockOptions,
          activeGroups: ['kibana.alert.rule.name', 'host.name'],
        },
      },
    });

    const { getByTestId } = render(
      <TestProviders store={store}>
        <GroupedAlertsTable {...testProps} />
      </TestProviders>
    );
    fireEvent.click(within(getByTestId('level-0-group-0')).getByTestId('group-panel-toggle'));
    expect(
      within(getByTestId('level-0-group-0')).queryByTestId('alerts-table')
    ).not.toBeInTheDocument();
    fireEvent.click(within(getByTestId('level-1-group-0')).getByTestId('group-panel-toggle'));
    expect(within(getByTestId('level-1-group-0')).getByTestId('alerts-table')).toBeInTheDocument();
  });

  it('resets all levels pagination when selected group changes', () => {
    jest
      .spyOn(window.localStorage, 'getItem')
      .mockReturnValue(getMockStorageState(['kibana.alert.rule.name', 'host.name', 'user.name']));
    store = createMockStore({
      ...mockGlobalState,
      groups: {
        [testProps.tableId]: {
          options: mockOptions,
          activeGroups: ['kibana.alert.rule.name', 'host.name', 'user.name'],
        },
      },
    });

    const { getByTestId, getAllByTestId } = render(
      <TestProviders store={store}>
        <GroupedAlertsTable {...testProps} />
      </TestProviders>
    );

    fireEvent.click(getByTestId('pagination-button-1'));
    fireEvent.click(within(getByTestId('level-0-group-0')).getByTestId('group-panel-toggle'));

    fireEvent.click(within(getByTestId('level-0-group-0')).getByTestId('pagination-button-1'));
    fireEvent.click(within(getByTestId('level-1-group-0')).getByTestId('group-panel-toggle'));

    fireEvent.click(within(getByTestId('level-1-group-0')).getByTestId('pagination-button-1'));

    [
      getByTestId('grouping-level-0-pagination'),
      getByTestId('grouping-level-1-pagination'),
      getByTestId('grouping-level-2-pagination'),
    ].forEach((pagination) => {
      expect(
        within(pagination).getByTestId('pagination-button-0').getAttribute('aria-current')
      ).toEqual(null);
      expect(
        within(pagination).getByTestId('pagination-button-1').getAttribute('aria-current')
      ).toEqual('true');
    });

    fireEvent.click(getAllByTestId('group-selector-dropdown')[0]);
    fireEvent.click(getAllByTestId('panel-user.name')[0]);

    [
      getByTestId('grouping-level-0-pagination'),
      getByTestId('grouping-level-1-pagination'),
      // level 2 has been removed with the group selection change
    ].forEach((pagination) => {
      expect(
        within(pagination).getByTestId('pagination-button-0').getAttribute('aria-current')
      ).toEqual('true');
      expect(
        within(pagination).getByTestId('pagination-button-1').getAttribute('aria-current')
      ).toEqual(null);
    });
  });

  it('resets all levels pagination when global query updates', () => {
    jest
      .spyOn(window.localStorage, 'getItem')
      .mockReturnValue(getMockStorageState(['kibana.alert.rule.name', 'host.name', 'user.name']));
    store = createMockStore({
      ...mockGlobalState,
      groups: {
        [testProps.tableId]: {
          options: mockOptions,
          activeGroups: ['kibana.alert.rule.name', 'host.name', 'user.name'],
        },
      },
    });

    const { getByTestId, rerender } = render(
      <TestProviders store={store}>
        <GroupedAlertsTable {...testProps} />
      </TestProviders>
    );

    fireEvent.click(getByTestId('pagination-button-1'));
    fireEvent.click(within(getByTestId('level-0-group-0')).getByTestId('group-panel-toggle'));
    fireEvent.click(within(getByTestId('level-0-group-0')).getByTestId('pagination-button-1'));
    fireEvent.click(within(getByTestId('level-1-group-0')).getByTestId('group-panel-toggle'));
    fireEvent.click(within(getByTestId('level-1-group-0')).getByTestId('pagination-button-1'));

    rerender(
      <TestProviders store={store}>
        <GroupedAlertsTable
          {...{ ...testProps, globalQuery: { query: 'updated', language: 'language' } }}
        />
      </TestProviders>
    );

    [
      getByTestId('grouping-level-0-pagination'),
      getByTestId('grouping-level-1-pagination'),
      getByTestId('grouping-level-2-pagination'),
    ].forEach((pagination) => {
      expect(
        within(pagination).getByTestId('pagination-button-0').getAttribute('aria-current')
      ).toEqual('true');
      expect(
        within(pagination).getByTestId('pagination-button-1').getAttribute('aria-current')
      ).toEqual(null);
    });
  });

  it('resets only most inner group pagination when its parent groups open/close', () => {
    store = createMockStore({
      ...mockGlobalState,
      groups: {
        [testProps.tableId]: {
          options: mockOptions,
          activeGroups: ['kibana.alert.rule.name', 'host.name', 'user.name'],
        },
      },
    });

    const { getByTestId } = render(
      <TestProviders store={store}>
        <GroupedAlertsTable {...testProps} />
      </TestProviders>
    );

    // set level 0 page to 2
    fireEvent.click(getByTestId('pagination-button-1'));
    fireEvent.click(within(getByTestId('level-0-group-0')).getByTestId('group-panel-toggle'));

    // set level 1 page to 2
    fireEvent.click(within(getByTestId('level-0-group-0')).getByTestId('pagination-button-1'));
    fireEvent.click(within(getByTestId('level-1-group-0')).getByTestId('group-panel-toggle'));

    // set level 2 page to 2
    fireEvent.click(within(getByTestId('level-1-group-0')).getByTestId('pagination-button-1'));
    fireEvent.click(within(getByTestId('level-2-group-0')).getByTestId('group-panel-toggle'));

    // open different level 1 group

    // level 0, 1 pagination is the same
    fireEvent.click(within(getByTestId('level-1-group-1')).getByTestId('group-panel-toggle'));
    [
      getByTestId('grouping-level-0-pagination'),
      getByTestId('grouping-level-1-pagination'),
    ].forEach((pagination) => {
      expect(
        within(pagination).getByTestId('pagination-button-0').getAttribute('aria-current')
      ).toEqual(null);
      expect(
        within(pagination).getByTestId('pagination-button-1').getAttribute('aria-current')
      ).toEqual('true');
    });

    // level 2 pagination is reset
    expect(
      within(getByTestId('grouping-level-2-pagination'))
        .getByTestId('pagination-button-0')
        .getAttribute('aria-current')
    ).toEqual('true');
    expect(
      within(getByTestId('grouping-level-2-pagination'))
        .getByTestId('pagination-button-1')
        .getAttribute('aria-current')
    ).toEqual(null);
  });

  it(`resets innermost level's current page when that level's page size updates`, () => {
    store = createMockStore({
      ...mockGlobalState,
      groups: {
        [testProps.tableId]: {
          options: mockOptions,
          activeGroups: ['kibana.alert.rule.name', 'host.name', 'user.name'],
        },
      },
    });

    const { getByTestId } = render(
      <TestProviders store={store}>
        <GroupedAlertsTable {...testProps} />
      </TestProviders>
    );

    fireEvent.click(getByTestId('pagination-button-1'));
    fireEvent.click(within(getByTestId('level-0-group-0')).getByTestId('group-panel-toggle'));
    fireEvent.click(within(getByTestId('level-0-group-0')).getByTestId('pagination-button-1'));
    fireEvent.click(within(getByTestId('level-1-group-0')).getByTestId('group-panel-toggle'));

    fireEvent.click(within(getByTestId('level-1-group-0')).getByTestId('pagination-button-1'));
    fireEvent.click(
      within(getByTestId('grouping-level-2')).getByTestId('tablePaginationPopoverButton')
    );
    fireEvent.click(getByTestId('tablePagination-100-rows'));
    [
      getByTestId('grouping-level-0-pagination'),
      getByTestId('grouping-level-1-pagination'),
      getByTestId('grouping-level-2-pagination'),
    ].forEach((pagination, i) => {
      if (i !== 2) {
        expect(
          within(pagination).getByTestId('pagination-button-0').getAttribute('aria-current')
        ).toEqual(null);
        expect(
          within(pagination).getByTestId('pagination-button-1').getAttribute('aria-current')
        ).toEqual('true');
      } else {
        expect(
          within(pagination).getByTestId('pagination-button-0').getAttribute('aria-current')
        ).toEqual('true');
        expect(within(pagination).queryByTestId('pagination-button-1')).not.toBeInTheDocument();
      }
    });
  });

  it(`resets outermost level's current page when that level's page size updates`, () => {
    store = createMockStore({
      ...mockGlobalState,
      groups: {
        [testProps.tableId]: {
          options: mockOptions,
          activeGroups: ['kibana.alert.rule.name', 'host.name', 'user.name'],
        },
      },
    });

    const { getByTestId, getAllByTestId } = render(
      <TestProviders store={store}>
        <GroupedAlertsTable {...testProps} />
      </TestProviders>
    );

    fireEvent.click(getByTestId('pagination-button-1'));
    fireEvent.click(within(getByTestId('level-0-group-0')).getByTestId('group-panel-toggle'));

    fireEvent.click(within(getByTestId('level-0-group-0')).getByTestId('pagination-button-1'));
    fireEvent.click(within(getByTestId('level-1-group-0')).getByTestId('group-panel-toggle'));

    fireEvent.click(within(getByTestId('level-1-group-0')).getByTestId('pagination-button-1'));
    const tablePaginations = getAllByTestId('tablePaginationPopoverButton');
    fireEvent.click(tablePaginations[tablePaginations.length - 1]);
    fireEvent.click(getByTestId('tablePagination-100-rows'));

    [
      getByTestId('grouping-level-0-pagination'),
      getByTestId('grouping-level-1-pagination'),
      getByTestId('grouping-level-2-pagination'),
    ].forEach((pagination, i) => {
      if (i !== 0) {
        expect(
          within(pagination).getByTestId('pagination-button-0').getAttribute('aria-current')
        ).toEqual(null);
        expect(
          within(pagination).getByTestId('pagination-button-1').getAttribute('aria-current')
        ).toEqual('true');
      } else {
        expect(
          within(pagination).getByTestId('pagination-button-0').getAttribute('aria-current')
        ).toEqual('true');
        expect(within(pagination).queryByTestId('pagination-button-1')).not.toBeInTheDocument();
      }
    });
  });

  it('sends telemetry data when selected group changes', () => {
    jest
      .spyOn(window.localStorage, 'getItem')
      .mockReturnValue(getMockStorageState(['kibana.alert.rule.name']));
    store = createMockStore({
      ...mockGlobalState,
      groups: {
        [testProps.tableId]: {
          options: mockOptions,
          activeGroups: ['kibana.alert.rule.name'],
        },
      },
    });

    const { getByTestId } = render(
      <TestProviders store={store}>
        <GroupedAlertsTable {...testProps} />
      </TestProviders>
    );

    fireEvent.click(getByTestId('group-selector-dropdown'));
    fireEvent.click(getByTestId('panel-user.name'));

    expect(mockedTelemetry.reportEvent).toHaveBeenCalledWith(
      AlertsEventTypes.AlertsGroupingChanged,
      {
        groupByField: 'user.name',
        tableId: testProps.tableId,
      }
    );

    fireEvent.click(getByTestId('group-selector-dropdown'));
    fireEvent.click(getByTestId('panel-host.name'));

    expect(mockedTelemetry.reportEvent).toHaveBeenCalledWith(
      AlertsEventTypes.AlertsGroupingChanged,
      {
        groupByField: 'host.name',
        tableId: testProps.tableId,
      }
    );
  });
});
