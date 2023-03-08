/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
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
import { mockCasesContext } from '@kbn/cases-plugin/public/mocks/mock_cases_context';
import { mockTimelines } from '../../../common/mock/mock_timelines_plugin';
import { createFilterManagerMock } from '@kbn/data-plugin/public/query/filter_manager/filter_manager.mock';
import type { State } from '../../../common/store';
import { createStore } from '../../../common/store';
import { createStartServicesMock } from '../../../common/lib/kibana/kibana_react.mock';
import { isNoneGroup, useGrouping } from '@kbn/securitysolution-grouping';

jest.mock('@kbn/securitysolution-grouping');

jest.mock('../../../common/containers/sourcerer');
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
jest.mock('../../../common/utils/normalize_time_range');

const mockUseFieldBrowserOptions = jest.fn();
jest.mock('../../../timelines/components/fields_browser', () => ({
  useFieldBrowserOptions: (props: UseFieldBrowserOptionsProps) => mockUseFieldBrowserOptions(props),
}));

const mockUseResizeObserver: jest.Mock = useResizeObserver as jest.Mock;
jest.mock('use-resize-observer/polyfilled');
mockUseResizeObserver.mockImplementation(() => ({}));

const mockFilterManager = createFilterManagerMock();

const mockKibanaServices = createStartServicesMock();

jest.mock('../../../common/lib/kibana', () => {
  const original = jest.requireActual('../../../common/lib/kibana');

  return {
    ...original,
    useUiSetting$: jest.fn().mockReturnValue([]),
    useKibana: () => ({
      services: {
        ...mockKibanaServices,
        application: {
          navigateToUrl: jest.fn(),
          capabilities: {
            siem: { crud_alerts: true, read_alerts: true },
          },
        },
        cases: {
          ui: { getCasesContext: mockCasesContext },
        },
        uiSettings: {
          get: jest.fn(),
        },
        timelines: { ...mockTimelines },
        data: {
          query: {
            filterManager: mockFilterManager,
          },
        },
        docLinks: {
          links: {
            siem: {
              privileges: 'link',
            },
          },
        },
        storage: {
          get: jest.fn(),
          set: jest.fn(),
        },
        triggerActionsUi: {
          getAlertsStateTable: jest.fn(() => <></>),
          alertsTableConfigurationRegistry: {},
        },
      },
    }),
    useToasts: jest.fn().mockReturnValue({
      addError: jest.fn(),
      addSuccess: jest.fn(),
      addWarning: jest.fn(),
      remove: jest.fn(),
    }),
  };
});
const state: State = {
  ...mockGlobalState,
};
const { storage } = createSecuritySolutionStorageMock();
const store = createStore(state, SUB_PLUGINS_REDUCER, kibanaObservable, storage);

const groupingStore = createStore(
  {
    ...state,
    groups: {
      groupSelector: <></>,
      selectedGroup: 'host.name',
    },
  },
  SUB_PLUGINS_REDUCER,
  kibanaObservable,
  storage
);

jest.mock('./timeline_actions/use_add_bulk_to_timeline', () => ({
  useAddBulkToTimelineAction: jest.fn(() => {}),
}));

jest.mock('./timeline_actions/use_bulk_add_to_case_actions', () => ({
  useBulkAddToCaseActions: jest.fn(() => []),
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

const resetPagination = jest.fn();

describe('GroupedAlertsTable', () => {
  const getGrouping = jest.fn().mockReturnValue(<span data-test-subj={'grouping-table'} />);
  beforeEach(() => {
    jest.clearAllMocks();
    (useSourcererDataView as jest.Mock).mockReturnValue({
      ...sourcererDataView,
      selectedPatterns: ['myFakebeat-*'],
    });
    (isNoneGroup as jest.Mock).mockReturnValue(true);
    (useGrouping as jest.Mock).mockReturnValue({
      groupSelector: <></>,
      getGrouping,
      selectedGroup: 'host.name',
      pagination: { pageSize: 1, pageIndex: 0, reset: resetPagination },
    });
  });

  it('calls the proper initial dispatch actions for groups', () => {
    render(
      <TestProviders store={store}>
        <GroupedAlertsTableComponent {...testProps} />
      </TestProviders>
    );
    expect(mockDispatch).toHaveBeenCalledTimes(2);
    expect(mockDispatch.mock.calls[0][0].type).toEqual(
      'x-pack/security_solution/groups/UPDATE_GROUP_SELECTOR'
    );
    expect(mockDispatch.mock.calls[1][0].type).toEqual(
      'x-pack/security_solution/groups/UPDATE_SELECTED_GROUP'
    );
  });

  it('renders alerts table when no group selected', () => {
    const { getByTestId, queryByTestId } = render(
      <TestProviders store={store}>
        <GroupedAlertsTableComponent {...testProps} />
      </TestProviders>
    );
    expect(getByTestId('alerts-table')).toBeInTheDocument();
    expect(queryByTestId('grouping-table')).not.toBeInTheDocument();
  });

  it('renders grouped alerts when group selected', async () => {
    (isNoneGroup as jest.Mock).mockReturnValue(false);

    const { getByTestId, queryByTestId } = render(
      <TestProviders store={groupingStore}>
        <GroupedAlertsTableComponent {...testProps} />
      </TestProviders>
    );
    expect(getByTestId('grouping-table')).toBeInTheDocument();
    expect(queryByTestId('alerts-table')).not.toBeInTheDocument();
    expect(getGrouping.mock.calls[0][0].isLoading).toEqual(false);
  });

  it('renders loading when expected', () => {
    (isNoneGroup as jest.Mock).mockReturnValue(false);
    render(
      <TestProviders store={groupingStore}>
        <GroupedAlertsTableComponent {...testProps} loading={true} />
      </TestProviders>
    );
    expect(getGrouping.mock.calls[0][0].isLoading).toEqual(true);
  });

  it('resets grouping pagination when global query updates', () => {
    (isNoneGroup as jest.Mock).mockReturnValue(false);
    const { rerender } = render(
      <TestProviders store={groupingStore}>
        <GroupedAlertsTableComponent {...testProps} />
      </TestProviders>
    );
    // called on initial query definition
    expect(resetPagination).toHaveBeenCalledTimes(1);
    rerender(
      <TestProviders store={groupingStore}>
        <GroupedAlertsTableComponent
          {...{ ...testProps, globalQuery: { query: 'updated', language: 'language' } }}
        />
      </TestProviders>
    );
    expect(resetPagination).toHaveBeenCalledTimes(2);
  });
});
