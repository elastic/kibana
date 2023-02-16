/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { mount, shallow } from 'enzyme';
import { waitFor } from '@testing-library/react';

import useResizeObserver from 'use-resize-observer/polyfilled';

import '../../../common/mock/match_media';
import {
  createSecuritySolutionStorageMock,
  kibanaObservable,
  mockGlobalState,
  SUB_PLUGINS_REDUCER,
  TestProviders,
} from '../../../common/mock';
import { AlertsTableComponent } from '.';
import { TableId } from '../../../../common/types';
import { useSourcererDataView } from '../../../common/containers/sourcerer';
import type { UseFieldBrowserOptionsProps } from '../../../timelines/components/fields_browser';
import { mockCasesContext } from '@kbn/cases-plugin/public/mocks/mock_cases_context';
import { mockTimelines } from '../../../common/mock/mock_timelines_plugin';
import { createFilterManagerMock } from '@kbn/data-plugin/public/query/filter_manager/filter_manager.mock';
import type { State } from '../../../common/store';
import { createStore } from '../../../common/store';

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

jest.mock('../../../common/lib/kibana', () => {
  const original = jest.requireActual('../../../common/lib/kibana');

  return {
    ...original,
    useUiSetting$: jest.fn().mockReturnValue([]),
    useKibana: () => ({
      services: {
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

jest.mock('./timeline_actions/use_bulk_add_to_case_actions', () => ({
  useBulkAddToCaseActions: jest.fn(() => []),
}));

const sourcererDataView = {
  indicesExist: true,
  loading: false,
  indexPattern: {
    fields: [],
  },
};

describe('AlertsTableComponent', () => {
  (useSourcererDataView as jest.Mock).mockReturnValue({
    ...sourcererDataView,
    selectedPatterns: ['myFakebeat-*'],
  });

  it('renders correctly', () => {
    const wrapper = shallow(
      <TestProviders>
        <AlertsTableComponent
          tableId={TableId.test}
          hasIndexWrite
          hasIndexMaintenance
          from={'2020-07-07T08:20:18.966Z'}
          loading
          to={'2020-07-08T08:20:18.966Z'}
          globalQuery={{
            query: 'query',
            language: 'language',
          }}
          globalFilters={[]}
          loadingEventIds={[]}
          isSelectAllChecked={false}
          showBuildingBlockAlerts={false}
          onShowBuildingBlockAlertsChanged={jest.fn()}
          showOnlyThreatIndicatorAlerts={false}
          onShowOnlyThreatIndicatorAlertsChanged={jest.fn()}
          dispatch={jest.fn()}
          runtimeMappings={{}}
          signalIndexName={'test'}
        />
      </TestProviders>
    );

    expect(wrapper.find('[title="Alerts"]')).toBeTruthy();
  });

  it('it renders groupping fields options when the grouping field is selected', async () => {
    const wrapper = mount(
      <TestProviders store={store}>
        <AlertsTableComponent
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
          loadingEventIds={[]}
          isSelectAllChecked={false}
          showBuildingBlockAlerts={false}
          onShowBuildingBlockAlertsChanged={jest.fn()}
          showOnlyThreatIndicatorAlerts={false}
          onShowOnlyThreatIndicatorAlertsChanged={jest.fn()}
          dispatch={jest.fn()}
          runtimeMappings={{}}
          signalIndexName={'test'}
        />
      </TestProviders>
    );
    await waitFor(() => {
      expect(wrapper.find('[data-test-subj="group-selector-dropdown"]').exists()).toBe(true);
      wrapper.find('[data-test-subj="group-selector-dropdown"]').first().simulate('click');
      expect(wrapper.find('[data-test-subj="panel-kibana.alert.rule.name"]').exists()).toBe(true);
    });
  });
});
