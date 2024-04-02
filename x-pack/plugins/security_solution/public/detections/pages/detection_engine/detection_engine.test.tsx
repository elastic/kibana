/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';
import { render, waitFor } from '@testing-library/react';
import { useParams } from 'react-router-dom';
import '../../../common/mock/match_media';
import { mockGlobalState, TestProviders, createMockStore } from '../../../common/mock';
import { DetectionEnginePage } from './detection_engine';
import { useUserData } from '../../components/user_info';
import { useSourcererDataView } from '../../../common/containers/sourcerer';
import type { State } from '../../../common/store';
import { mockHistory, Router } from '../../../common/mock/router';
import { mockTimelines } from '../../../common/mock/mock_timelines_plugin';
import { mockBrowserFields } from '../../../common/containers/source/mock';
import { mockCasesContext } from '@kbn/cases-plugin/public/mocks/mock_cases_context';
import { createFilterManagerMock } from '@kbn/data-plugin/public/query/filter_manager/filter_manager.mock';
import { dataViewPluginMocks } from '@kbn/data-views-plugin/public/mocks';
import { createStubDataView } from '@kbn/data-views-plugin/common/data_view.stub';
import { useListsConfig } from '../../containers/detection_engine/lists/use_lists_config';
import { FilterGroup } from '@kbn/alerts-ui-shared/src/alert_filter_controls/filter_group';
import type { AlertsTableComponentProps } from '../../components/alerts_table/alerts_grouping';
import { getMockedFilterGroupWithCustomFilters } from '@kbn/alerts-ui-shared/src/alert_filter_controls/mocks';
import { TableId } from '@kbn/securitysolution-data-table';
import { useUpsellingMessage } from '../../../common/hooks/use_upselling';

// Test will fail because we will to need to mock some core services to make the test work
// For now let's forget about SiemSearchBar and QueryBar
jest.mock('../../../common/components/search_bar', () => ({
  SiemSearchBar: () => null,
}));
jest.mock('../../../common/components/query_bar', () => ({
  QueryBar: () => null,
}));
jest.mock('../../../common/hooks/use_space_id', () => ({
  useSpaceId: () => 'default',
}));
jest.mock('@kbn/alerts-ui-shared/src/alert_filter_controls/filter_group');

const mockStatusCapture = jest.fn();
const GroupedAlertsTable: React.FC<AlertsTableComponentProps> = ({
  currentAlertStatusFilterValue,
}) => {
  useEffect(() => {
    if (currentAlertStatusFilterValue) {
      mockStatusCapture(currentAlertStatusFilterValue);
    }
  }, [currentAlertStatusFilterValue]);
  return <span />;
};

jest.mock('../../components/alerts_table/alerts_grouping', () => ({
  GroupedAlertsTable,
}));

jest.mock('../../containers/detection_engine/lists/use_lists_config');
jest.mock('../../components/user_info');
jest.mock('../../../common/containers/sourcerer');
jest.mock('../../../common/components/link_to');
jest.mock('../../../common/containers/use_global_time', () => ({
  useGlobalTime: jest.fn().mockReturnValue({
    from: '2020-07-07T08:20:18.966Z',
    isInitializing: false,
    to: '2020-07-08T08:20:18.966Z',
    setQuery: jest.fn(),
  }),
}));
jest.mock('react-router-dom', () => {
  const originalModule = jest.requireActual('react-router-dom');

  return {
    ...originalModule,
    useParams: jest.fn(),
    useHistory: jest.fn(),
  };
});

const mockFilterManager = createFilterManagerMock();

const stubSecurityDataView = createStubDataView({
  spec: {
    id: 'security',
    title: 'security',
  },
});

const mockDataViewsService = {
  ...dataViewPluginMocks.createStartContract(),
  get: () => Promise.resolve(stubSecurityDataView),
  clearInstanceCache: () => Promise.resolve(),
};

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
        dataViews: mockDataViewsService,
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
        triggersActionsUi: {
          alertsTableConfigurationRegistry: {},
          getAlertsStateTable: () => <></>,
        },
        sessionView: {
          getSessionView: jest.fn().mockReturnValue(<div />),
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

jest.mock('../../../timelines/components/side_panel/hooks/use_detail_panel', () => {
  return {
    useDetailPanel: () => ({
      openEventDetailsPanel: jest.fn(),
      handleOnDetailsPanelClosed: () => {},
      DetailsPanel: () => <div />,
      shouldShowDetailsPanel: false,
    }),
  };
});
const dataViewId = 'security-solution-default';

const stateWithBuildingBlockAlertsEnabled: State = {
  ...mockGlobalState,
  dataTable: {
    ...mockGlobalState.dataTable,
    tableById: {
      ...mockGlobalState.dataTable.tableById,
      [TableId.test]: {
        ...mockGlobalState.dataTable.tableById[TableId.test],
        additionalFilters: {
          showOnlyThreatIndicatorAlerts: false,
          showBuildingBlockAlerts: true,
        },
      },
    },
  },
};

const stateWithThreatIndicatorsAlertEnabled: State = {
  ...mockGlobalState,
  dataTable: {
    ...mockGlobalState.dataTable,
    tableById: {
      ...mockGlobalState.dataTable.tableById,
      [TableId.test]: {
        ...mockGlobalState.dataTable.tableById[TableId.test],
        additionalFilters: {
          showOnlyThreatIndicatorAlerts: true,
          showBuildingBlockAlerts: false,
        },
      },
    },
  },
};

jest.mock('../../components/alerts_table/timeline_actions/use_add_bulk_to_timeline', () => ({
  useAddBulkToTimelineAction: jest.fn(() => {}),
}));

jest.mock('../../../common/components/visualization_actions/lens_embeddable');
jest.mock('../../../common/components/page/use_refetch_by_session');
jest.mock('../../../common/hooks/use_upselling');

describe('DetectionEnginePageComponent', () => {
  beforeAll(() => {
    (useListsConfig as jest.Mock).mockReturnValue({ loading: false, needsConfiguration: false });
    (useParams as jest.Mock).mockReturnValue({});
    (useUserData as jest.Mock).mockReturnValue([
      {
        loading: false,
        hasIndexRead: true,
        canUserREAD: true,
      },
    ]);
    (useSourcererDataView as jest.Mock).mockReturnValue({
      indicesExist: true,
      indexPattern: {},
      browserFields: mockBrowserFields,
    });
    (FilterGroup as jest.Mock).mockImplementation(() => {
      return <span />;
    });
    (useUpsellingMessage as jest.Mock).mockReturnValue('Go for Platinum!');
  });
  beforeEach(() => {
    jest.clearAllMocks();
  });
  it('renders correctly', async () => {
    const { getByTestId } = render(
      <TestProviders>
        <Router history={mockHistory}>
          <DetectionEnginePage />
        </Router>
      </TestProviders>
    );
    await waitFor(() => {
      expect(getByTestId('filter-group__loading')).toBeInTheDocument();
    });
  });

  it('renders the chart panels', async () => {
    const { getByTestId } = render(
      <TestProviders>
        <Router history={mockHistory}>
          <DetectionEnginePage />
        </Router>
      </TestProviders>
    );

    await waitFor(() => {
      expect(getByTestId('chartPanels')).toBeInTheDocument();
    });
  });

  it('should pass building block filter to the alert Page Controls', async () => {
    const MockedFilterGroup = FilterGroup as jest.Mock;
    MockedFilterGroup.mockImplementationOnce(getMockedFilterGroupWithCustomFilters());
    await waitFor(() => {
      render(
        <TestProviders store={createMockStore(stateWithBuildingBlockAlertsEnabled)}>
          <Router history={mockHistory}>
            <DetectionEnginePage />
          </Router>
        </TestProviders>
      );
    });

    expect(MockedFilterGroup).toHaveBeenCalledWith(
      expect.objectContaining({
        filters: [
          {
            meta: {
              alias: null,
              negate: true,
              disabled: false,
              type: 'exists',
              key: 'kibana.alert.building_block_type',
              value: 'exists',
              index: dataViewId,
            },
            query: {
              exists: {
                field: 'kibana.alert.building_block_type',
              },
            },
          },
        ],
      }),
      expect.anything()
    );
  });

  it('should pass threat Indicator filter to the alert Page Controls', async () => {
    const MockedFilterGroup = FilterGroup as jest.Mock;
    MockedFilterGroup.mockImplementationOnce(getMockedFilterGroupWithCustomFilters());

    await waitFor(() => {
      render(
        <TestProviders store={createMockStore(stateWithThreatIndicatorsAlertEnabled)}>
          <Router history={mockHistory}>
            <DetectionEnginePage />
          </Router>
        </TestProviders>
      );
    });

    expect(MockedFilterGroup).toHaveBeenCalledWith(
      expect.objectContaining({
        filters: [
          {
            meta: {
              alias: null,
              negate: true,
              disabled: false,
              type: 'exists',
              key: 'kibana.alert.building_block_type',
              value: 'exists',
              index: dataViewId,
            },
            query: {
              exists: {
                field: 'kibana.alert.building_block_type',
              },
            },
          },
        ],
      }),
      expect.anything()
    );
  });

  it('the pageFiltersUpdateHandler updates status when a multi status filter is passed', async () => {
    (FilterGroup as jest.Mock).mockImplementationOnce(
      getMockedFilterGroupWithCustomFilters([
        {
          meta: {
            index: 'security-solution-default',
            key: 'kibana.alert.workflow_status',
            params: ['open', 'acknowledged'],
          },
        },
      ])
    );
    await waitFor(() => {
      render(
        <TestProviders>
          <Router history={mockHistory}>
            <DetectionEnginePage />
          </Router>
        </TestProviders>
      );
    });
    // when statusFilter updates, we call mockStatusCapture in test mocks
    expect(mockStatusCapture).toHaveBeenNthCalledWith(1, []);
    expect(mockStatusCapture).toHaveBeenNthCalledWith(2, ['open', 'acknowledged']);
  });

  it('the pageFiltersUpdateHandler updates status when a single status filter is passed', async () => {
    (FilterGroup as jest.Mock).mockImplementationOnce(
      getMockedFilterGroupWithCustomFilters([
        {
          meta: {
            index: 'security-solution-default',
            key: 'kibana.alert.workflow_status',
            disabled: false,
          },
          query: {
            match_phrase: {
              'kibana.alert.workflow_status': 'open',
            },
          },
        },
        {
          meta: {
            index: 'security-solution-default',
            key: 'kibana.alert.severity',
            disabled: false,
          },
          query: {
            match_phrase: {
              'kibana.alert.severity': 'low',
            },
          },
        },
      ])
    );
    await waitFor(() => {
      render(
        <TestProviders>
          <Router history={mockHistory}>
            <DetectionEnginePage />
          </Router>
        </TestProviders>
      );
    });
    // when statusFilter updates, we call mockStatusCapture in test mocks
    expect(mockStatusCapture).toHaveBeenNthCalledWith(1, []);
    expect(mockStatusCapture).toHaveBeenNthCalledWith(2, ['open']);
  });

  it('the pageFiltersUpdateHandler clears status when no status filter is passed', async () => {
    (FilterGroup as jest.Mock).mockImplementationOnce(
      getMockedFilterGroupWithCustomFilters([
        {
          meta: {
            index: 'security-solution-default',
            key: 'kibana.alert.severity',
            disabled: false,
          },
          query: {
            match_phrase: {
              'kibana.alert.severity': 'low',
            },
          },
        },
      ])
    );
    await waitFor(() => {
      render(
        <TestProviders>
          <Router history={mockHistory}>
            <DetectionEnginePage />
          </Router>
        </TestProviders>
      );
    });
    // when statusFilter updates, we call mockStatusCapture in test mocks
    expect(mockStatusCapture).toHaveBeenNthCalledWith(1, []);
    expect(mockStatusCapture).toHaveBeenNthCalledWith(2, []);
  });
});
