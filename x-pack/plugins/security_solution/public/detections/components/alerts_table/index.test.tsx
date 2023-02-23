/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { shallow } from 'enzyme';
import { waitFor, render, fireEvent } from '@testing-library/react';
import type { Filter, Query } from '@kbn/es-query';
import useResizeObserver from 'use-resize-observer/polyfilled';

import '../../../common/mock/match_media';
import {
  createSecuritySolutionStorageMock,
  kibanaObservable,
  mockGlobalState,
  SUB_PLUGINS_REDUCER,
  TestProviders,
} from '../../../common/mock';
import { GroupedAlertsTableComponent } from './grouped_alerts';
import { TableId } from '../../../../common/types';
import { useSourcererDataView } from '../../../common/containers/sourcerer';
import type { UseFieldBrowserOptionsProps } from '../../../timelines/components/fields_browser';
import { mockCasesContext } from '@kbn/cases-plugin/public/mocks/mock_cases_context';
import { mockTimelines } from '../../../common/mock/mock_timelines_plugin';
import { createFilterManagerMock } from '@kbn/data-plugin/public/query/filter_manager/filter_manager.mock';
import type { State } from '../../../common/store';
import { createStore } from '../../../common/store';
import { AlertsTableComponent } from '.';
import { createStartServicesMock } from '../../../common/lib/kibana/kibana_react.mock';

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
    {
      label: 'ruleName',
      key: 'kibana.alert.rule.name',
    },
    {
      label: 'userName',
      key: 'user.name',
    },
    {
      label: 'hostName',
      key: 'host.name',
    },
    {
      label: 'sourceIP',
      key: 'source.ip',
    },
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

const from = '2020-07-07T08:20:18.966Z';
const to = '2020-07-08T08:20:18.966Z';
const renderChildComponent = (groupingFilters: Filter[]) => (
  <AlertsTableComponent
    configId={'testing'}
    flyoutSize="m"
    inputFilters={[...[], ...groupingFilters]}
    tableId={TableId.alertsOnAlertsPage}
    isLoading={false}
  />
);

describe('GroupedAlertsTable', () => {
  (useSourcererDataView as jest.Mock).mockReturnValue({
    ...sourcererDataView,
    selectedPatterns: ['myFakebeat-*'],
  });

  it('renders correctly', () => {
    const wrapper = shallow(
      <TestProviders store={store}>
        <GroupedAlertsTableComponent
          defaultFilters={[]}
          tableId={TableId.test}
          from={from}
          to={to}
          globalQuery={
            {
              query: 'query',
              language: 'language',
            } as Query
          }
          globalFilters={[]}
          dispatch={jest.fn()}
          runtimeMappings={{}}
          signalIndexName={'test'}
          hasIndexWrite
          hasIndexMaintenance
          loading={false}
          renderChildComponent={renderChildComponent}
        />
      </TestProviders>
    );

    expect(wrapper.find('[title="Alerts"]')).toBeTruthy();
  });

  // Not a valid test as of now.. because, table is used from trigger actions..
  // Need to find a better way to test grouping
  // Need to make grouping_alerts independent of Alerts Table.
  it.skip('it renders groupping fields options when the grouping field is selected', async () => {
    const { getByTestId, getAllByTestId } = render(
      <TestProviders store={store}>
        <GroupedAlertsTableComponent
          tableId={TableId.test}
          hasIndexWrite
          hasIndexMaintenance
          from={'2020-07-07T08:20:18.966Z'}
          loading={false}
          to={'2020-07-08T08:20:18.966Z'}
          globalQuery={{
            query: 'query',
            language: 'language',
          }}
          globalFilters={[]}
          dispatch={jest.fn()}
          runtimeMappings={{}}
          signalIndexName={'test'}
          renderChildComponent={() => <></>}
        />
      </TestProviders>
    );
    await waitFor(() => {
      expect(getByTestId('[data-test-subj="group-selector-dropdown"]')).toBeVisible();
      fireEvent.click(getAllByTestId('group-selector-dropdown')[0]);
      expect(getByTestId('[data-test-subj="panel-kibana.alert.rule.name"]')).toBeVisible();
    });
  });
});
