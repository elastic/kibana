/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { BehaviorSubject } from 'rxjs';
import userEvent from '@testing-library/user-event';
import { get } from 'lodash';
import { fireEvent, render, waitFor, screen, act } from '@testing-library/react';
import {
  AlertConsumers,
  ALERT_CASE_IDS,
  ALERT_MAINTENANCE_WINDOW_IDS,
  ALERT_UUID,
} from '@kbn/rule-data-utils';
import { Storage } from '@kbn/kibana-utils-plugin/public';

import {
  Alerts,
  AlertsField,
  AlertsTableConfigurationRegistry,
  AlertsTableFlyoutBaseProps,
  AlertsTableProps,
  FetchAlertData,
  RenderCustomActionsRowArgs,
} from '../../../types';
import { PLUGIN_ID } from '../../../common/constants';
import AlertsTableState, { AlertsTableStateProps } from './alerts_table_state';
import { AlertsTable } from './alerts_table';
import { useBulkGetCases } from './hooks/use_bulk_get_cases';
import { DefaultSort } from './hooks';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { BrowserFields } from '@kbn/alerting-types';
import { getCasesMockMap } from './cases/index.mock';
import { createCasesServiceMock } from './index.mock';
import { useBulkGetMaintenanceWindows } from './hooks/use_bulk_get_maintenance_windows';
import { getMaintenanceWindowMockMap } from './maintenance_windows/index.mock';
import { AlertTableConfigRegistry } from '../../alert_table_config_registry';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fetchAlertsFields } from '@kbn/alerts-ui-shared/src/common/apis/fetch_alerts_fields';
import { useSearchAlertsQuery } from '@kbn/alerts-ui-shared/src/common/hooks';

jest.mock('@kbn/kibana-utils-plugin/public');
jest.mock('@kbn/alerts-ui-shared/src/common/hooks/use_search_alerts_query');
jest.mock('@kbn/alerts-ui-shared/src/common/apis/fetch_alerts_fields');

jest.mock('./hooks/use_bulk_get_cases');
jest.mock('./hooks/use_bulk_get_maintenance_windows');
jest.mock('./alerts_table', () => {
  return {
    AlertsTable: jest.fn(),
  };
});

const MockAlertsTable = jest.mocked(AlertsTable);
const mockCurrentAppId$ = new BehaviorSubject<string>('testAppId');
const mockCaseService = createCasesServiceMock();

jest.mock('../../../common/lib/kibana/kibana_react', () => ({
  useKibana: () => ({
    services: {
      application: {
        getUrlForApp: jest.fn(() => ''),
        capabilities: {
          fakeCases: {
            create_cases: true,
            read_cases: true,
            update_cases: true,
            delete_cases: true,
            push_cases: true,
          },
        },
        currentAppId$: mockCurrentAppId$,
      },
      cases: mockCaseService,
      notifications: {
        toasts: {
          addDanger: () => {},
        },
      },
      data: {},
    },
  }),
}));

const originalGetComputedStyle = Object.assign({}, window.getComputedStyle);

beforeAll(() => {
  // The JSDOM implementation is too slow
  // Especially for dropdowns that try to position themselves
  // perf issue - https://github.com/jsdom/jsdom/issues/3234
  Object.defineProperty(window, 'getComputedStyle', {
    value: (el: HTMLElement) => {
      /**
       * This is based on the jsdom implementation of getComputedStyle
       * https://github.com/jsdom/jsdom/blob/9dae17bf0ad09042cfccd82e6a9d06d3a615d9f4/lib/jsdom/browser/Window.js#L779-L820
       *
       * It is missing global style parsing and will only return styles applied directly to an element.
       * Will not return styles that are global or from emotion
       */
      const declaration = new CSSStyleDeclaration();
      const { style } = el;

      Array.prototype.forEach.call(style, (property: string) => {
        declaration.setProperty(
          property,
          style.getPropertyValue(property),
          style.getPropertyPriority(property)
        );
      });

      return declaration;
    },
    configurable: true,
    writable: true,
  });
});

afterAll(() => {
  Object.defineProperty(window, 'getComputedStyle', originalGetComputedStyle);
});

const columns = [
  {
    id: AlertsField.name,
    displayAsText: 'Name',
  },
  {
    id: AlertsField.reason,
    displayAsText: 'Reason',
  },
  {
    id: ALERT_CASE_IDS,
    displayAsText: 'Cases',
  },
  {
    id: ALERT_MAINTENANCE_WINDOW_IDS,
    displayAsText: 'Maintenance Windows',
  },
];

const alerts = [
  {
    [AlertsField.name]: ['one'],
    [AlertsField.reason]: ['two'],
    [AlertsField.uuid]: ['1047d115-670d-469e-af7a-86fdd2b2f814'],
    [ALERT_UUID]: ['alert-id-1'],
    [ALERT_CASE_IDS]: ['test-id'],
    [ALERT_MAINTENANCE_WINDOW_IDS]: ['test-mw-id-1'],
  },
  {
    [AlertsField.name]: ['three'],
    [AlertsField.reason]: ['four'],
    [AlertsField.uuid]: ['bf5f6d63-5afd-48e0-baf6-f28c2b68db46'],
    [ALERT_CASE_IDS]: ['test-id-2'],
    [ALERT_MAINTENANCE_WINDOW_IDS]: ['test-mw-id-2'],
  },
  {
    [AlertsField.name]: ['five'],
    [AlertsField.reason]: ['six'],
    [AlertsField.uuid]: ['1047d115-5afd-469e-baf6-f28c2b68db46'],
    [ALERT_CASE_IDS]: [],
    [ALERT_MAINTENANCE_WINDOW_IDS]: [],
  },
] as unknown as Alerts;

const oldAlertsData = [
  [
    {
      field: AlertsField.name,
      value: ['one'],
    },
    {
      field: AlertsField.reason,
      value: ['two'],
    },
  ],
  [
    {
      field: AlertsField.name,
      value: ['three'],
    },
    {
      field: AlertsField.reason,
      value: ['four'],
    },
  ],
  [
    {
      field: AlertsField.name,
      value: ['five'],
    },
    {
      field: AlertsField.reason,
      value: ['six'],
    },
  ],
] as FetchAlertData['oldAlertsData'];

const ecsAlertsData = [
  [
    {
      '@timestamp': ['2023-01-28T10:48:49.559Z'],
      _id: 'SomeId',
      _index: 'SomeIndex',
      kibana: {
        alert: {
          rule: {
            name: ['one'],
          },
          reason: ['two'],
        },
      },
    },
  ],
  [
    {
      '@timestamp': ['2023-01-27T10:48:49.559Z'],
      _id: 'SomeId2',
      _index: 'SomeIndex',
      kibana: {
        alert: {
          rule: {
            name: ['three'],
          },
          reason: ['four'],
        },
      },
    },
  ],
  [
    {
      '@timestamp': ['2023-01-26T10:48:49.559Z'],
      _id: 'SomeId3',
      _index: 'SomeIndex',
      kibana: {
        alert: {
          rule: {
            name: ['five'],
          },
          reason: ['six'],
        },
      },
    },
  ],
] as FetchAlertData['ecsAlertsData'];

const FlyoutBody = ({ alert }: AlertsTableFlyoutBaseProps) => (
  <ul>
    {columns.map((column) => (
      <li data-test-subj={`alertsFlyout${column.displayAsText}`} key={column.id}>
        {get(alert as any, column.id, [])[0]}
      </li>
    ))}
  </ul>
);

const hasMock = jest.fn().mockImplementation((plugin: string) => {
  return plugin === PLUGIN_ID;
});

const getMock = jest.fn().mockImplementation((plugin: string) => {
  if (plugin === PLUGIN_ID) {
    return {
      columns,
      sort: DefaultSort,
      externalFlyout: { body: FlyoutBody },
      useInternalFlyout: () => ({
        body: FlyoutBody,
        header: () => <>{'header'}</>,
        footer: () => <>{'footer'}</>,
      }),
      useActionsColumn: () => ({
        renderCustomActionsRow: ({ setFlyoutAlert }: RenderCustomActionsRowArgs) => {
          return (
            <button
              data-test-subj="expandColumnCellOpenFlyoutButton-0"
              onClick={() => {
                setFlyoutAlert('alert-id-1');
              }}
            />
          );
        },
      }),
    };
  }
  return {};
});

const updateMock = jest.fn();
const getActionsMock = jest.fn();
const alertsTableConfigurationRegistryMock = {
  has: hasMock,
  get: getMock,
  getActions: getActionsMock,
  update: updateMock,
} as unknown as AlertTableConfigRegistry;

const mockStorage = Storage as jest.Mock;

mockStorage.mockImplementation(() => {
  return { get: jest.fn(), set: jest.fn() };
});

const refetchMock = jest.fn();
const mockUseSearchAlertsQuery = useSearchAlertsQuery as jest.Mock;
const searchAlertsResponse = {
  data: {
    alerts,
    ecsAlertsData,
    oldAlertsData,
    total: alerts.length,
    querySnapshot: { request: [], response: [] },
  },
  refetch: refetchMock,
};

mockUseSearchAlertsQuery.mockReturnValue(searchAlertsResponse);

const casesMap = getCasesMockMap();
const useBulkGetCasesMock = useBulkGetCases as jest.Mock;

const maintenanceWindowsMap = getMaintenanceWindowMockMap();
const useBulkGetMaintenanceWindowsMock = useBulkGetMaintenanceWindows as jest.Mock;

const browserFields: BrowserFields = {
  kibana: {
    fields: {
      [AlertsField.uuid]: {
        category: 'kibana',
        name: AlertsField.uuid,
      },
      [AlertsField.name]: {
        category: 'kibana',
        name: AlertsField.name,
      },
      [AlertsField.reason]: {
        category: 'kibana',
        name: AlertsField.reason,
      },
    },
  },
};

jest.mocked(fetchAlertsFields).mockResolvedValue({ browserFields, fields: [] });

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
  },
});

const TestComponent: React.FunctionComponent<AlertsTableStateProps> = (props) => (
  <QueryClientProvider client={queryClient}>
    <IntlProvider locale="en">
      <AlertsTableState {...props} />
    </IntlProvider>
  </QueryClientProvider>
);

describe('AlertsTableState', () => {
  const tableProps: AlertsTableStateProps = {
    alertsTableConfigurationRegistry: alertsTableConfigurationRegistryMock,
    configurationId: PLUGIN_ID,
    id: PLUGIN_ID,
    featureIds: [AlertConsumers.LOGS],
    query: {},
    columns,
    pagination: {
      pageIndex: 0,
      pageSize: 10,
      onChangePage: jest.fn(),
      onChangeItemsPerPage: jest.fn(),
    },
  };

  const mockCustomProps = (customProps: Partial<AlertsTableConfigurationRegistry>) => {
    const getMockWithUsePersistentControls = jest.fn().mockImplementation((plugin: string) => {
      return {
        ...{
          columns,
          sort: DefaultSort,
        },
        ...customProps,
      };
    });

    const alertsTableConfigurationRegistryWithPersistentControlsMock = {
      has: hasMock,
      get: getMockWithUsePersistentControls,
      update: updateMock,
      getActions: getActionsMock,
    } as unknown as AlertTableConfigRegistry;

    return {
      ...tableProps,
      alertsTableConfigurationRegistry: alertsTableConfigurationRegistryWithPersistentControlsMock,
    };
  };

  let onPageChange: AlertsTableProps['onPageChange'];
  let refetchAlerts: AlertsTableProps['refetchAlerts'];

  MockAlertsTable.mockImplementation((props) => {
    const { AlertsTable: AlertsTableComponent } = jest.requireActual('./alerts_table');
    onPageChange = props.onPageChange;
    refetchAlerts = props.refetchAlerts;
    return <AlertsTableComponent {...props} />;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    useBulkGetCasesMock.mockReturnValue({ data: casesMap, isFetching: false });
    useBulkGetMaintenanceWindowsMock.mockReturnValue({
      data: maintenanceWindowsMap,
      isFetching: false,
    });
  });

  describe('Cases', () => {
    beforeEach(() => {
      jest.clearAllMocks();
      mockCaseService.helpers.canUseCases = jest.fn().mockReturnValue({ create: true, read: true });
    });

    afterAll(() => {
      mockCaseService.ui.getCasesContext = jest.fn().mockImplementation(() => null);
    });

    it('should show the cases column', async () => {
      render(<TestComponent {...tableProps} />);
      expect(await screen.findByText('Cases')).toBeInTheDocument();
    });

    it('should show the cases titles correctly', async () => {
      render(<TestComponent {...tableProps} />);
      expect(await screen.findByText('Test case')).toBeInTheDocument();
      expect(await screen.findByText('Test case 2')).toBeInTheDocument();
    });

    it('should show the loading skeleton when fetching cases', async () => {
      useBulkGetCasesMock.mockReturnValue({ data: casesMap, isFetching: true });

      render(<TestComponent {...tableProps} />);
      expect((await screen.findAllByTestId('cases-cell-loading')).length).toBe(3);
    });

    it('should pass the correct case ids to useBulkGetCases', async () => {
      render(<TestComponent {...tableProps} />);

      await waitFor(() => {
        expect(useBulkGetCasesMock).toHaveBeenCalledWith(['test-id', 'test-id-2'], true);
      });
    });

    it('remove duplicated case ids', async () => {
      mockUseSearchAlertsQuery.mockReturnValue({
        ...searchAlertsResponse,
        data: {
          ...searchAlertsResponse.data,
          alerts: [...searchAlertsResponse.data.alerts, ...searchAlertsResponse.data.alerts],
        },
      });

      render(<TestComponent {...tableProps} />);

      await waitFor(() => {
        expect(useBulkGetCasesMock).toHaveBeenCalledWith(['test-id', 'test-id-2'], true);
      });
    });

    it('skips alerts with empty case ids', async () => {
      mockUseSearchAlertsQuery.mockReturnValue({
        ...searchAlertsResponse,
        data: {
          ...searchAlertsResponse.data,
          alerts: [
            { ...searchAlertsResponse.data.alerts[0], 'kibana.alert.case_ids': [] },
            searchAlertsResponse.data.alerts[1],
          ],
        },
      });

      render(<TestComponent {...tableProps} />);

      await waitFor(() => {
        expect(useBulkGetCasesMock).toHaveBeenCalledWith(['test-id-2'], true);
      });
    });

    it('should not fetch cases if the user does not have permissions', async () => {
      mockCaseService.helpers.canUseCases = jest
        .fn()
        .mockReturnValue({ create: false, read: false });

      render(<TestComponent {...tableProps} />);

      await waitFor(() => {
        expect(useBulkGetCasesMock).toHaveBeenCalledWith(['test-id-2'], false);
      });
    });

    it('should not fetch cases if the column is not visible', async () => {
      mockCaseService.helpers.canUseCases = jest.fn().mockReturnValue({ create: true, read: true });

      const props = mockCustomProps({
        cases: { featureId: 'test-feature-id', owner: ['test-owner'] },
      });

      render(
        <TestComponent
          {...props}
          columns={[
            {
              id: AlertsField.name,
              displayAsText: 'Name',
            },
          ]}
        />
      );
      await waitFor(() => {
        expect(useBulkGetCasesMock).toHaveBeenCalledWith(['test-id-2'], false);
      });
    });

    it('calls canUseCases with an empty array if the case configuration is not defined', async () => {
      render(<TestComponent {...tableProps} />);
      expect(mockCaseService.helpers.canUseCases).toHaveBeenCalledWith([]);
    });

    it('calls canUseCases with the case owner if defined', async () => {
      const props = mockCustomProps({
        cases: { featureId: 'test-feature-id', owner: ['test-owner'] },
      });

      render(<TestComponent {...props} />);
      expect(mockCaseService.helpers.canUseCases).toHaveBeenCalledWith(['test-owner']);
    });

    it('should call the cases context with the correct props', async () => {
      const props = mockCustomProps({
        cases: { featureId: 'test-feature-id', owner: ['test-owner'] },
      });

      const CasesContextMock = jest.fn().mockReturnValue(null);
      mockCaseService.ui.getCasesContext = jest.fn().mockReturnValue(CasesContextMock);

      render(<TestComponent {...props} />);

      expect(CasesContextMock).toHaveBeenCalledWith(
        {
          children: expect.anything(),
          owner: ['test-owner'],
          permissions: { create: true, read: true },
          features: { alerts: { sync: false } },
        },
        {}
      );
    });

    it('should call the cases context with the empty owner if the case config is not defined', async () => {
      const CasesContextMock = jest.fn().mockReturnValue(null);
      mockCaseService.ui.getCasesContext = jest.fn().mockReturnValue(CasesContextMock);

      render(<TestComponent {...tableProps} />);
      expect(CasesContextMock).toHaveBeenCalledWith(
        {
          children: expect.anything(),
          owner: [],
          permissions: { create: true, read: true },
          features: { alerts: { sync: false } },
        },
        {}
      );
    });

    it('should call the cases context with correct permissions', async () => {
      const CasesContextMock = jest.fn().mockReturnValue(null);
      mockCaseService.ui.getCasesContext = jest.fn().mockReturnValue(CasesContextMock);
      mockCaseService.helpers.canUseCases = jest
        .fn()
        .mockReturnValue({ create: false, read: false });

      render(<TestComponent {...tableProps} />);
      expect(CasesContextMock).toHaveBeenCalledWith(
        {
          children: expect.anything(),
          owner: [],
          permissions: { create: false, read: false },
          features: { alerts: { sync: false } },
        },
        {}
      );
    });

    it('should call the cases context with sync alerts turned on if defined in the cases config', async () => {
      const props = mockCustomProps({
        cases: { featureId: 'test-feature-id', owner: ['test-owner'], syncAlerts: true },
      });

      const CasesContextMock = jest.fn().mockReturnValue(null);
      mockCaseService.ui.getCasesContext = jest.fn().mockReturnValue(CasesContextMock);

      render(<TestComponent {...props} />);
      expect(CasesContextMock).toHaveBeenCalledWith(
        {
          children: expect.anything(),
          owner: ['test-owner'],
          permissions: { create: true, read: true },
          features: { alerts: { sync: true } },
        },
        {}
      );
    });
  });

  describe('Maintenance windows', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should show maintenance windows column', async () => {
      render(<TestComponent {...tableProps} />);
      expect(await screen.findByText('Maintenance Windows')).toBeInTheDocument();
    });

    it('should show maintenance windows titles correctly', async () => {
      render(<TestComponent {...tableProps} />);
      expect(await screen.findByText('test-title')).toBeInTheDocument();
      expect(await screen.findByText('test-title-2')).toBeInTheDocument();
    });

    it('should pass the correct maintenance window ids to useBulkGetMaintenanceWindows', async () => {
      render(<TestComponent {...tableProps} />);
      await waitFor(() => {
        expect(useBulkGetMaintenanceWindowsMock).toHaveBeenCalledWith(
          expect.objectContaining({
            ids: ['test-mw-id-1', 'test-mw-id-2'],
            canFetchMaintenanceWindows: true,
          })
        );
      });
    });

    it('should remove duplicated maintenance window ids', async () => {
      mockUseSearchAlertsQuery.mockReturnValue({
        ...searchAlertsResponse,
        data: {
          ...searchAlertsResponse.data,
          alerts: [...searchAlertsResponse.data.alerts, ...searchAlertsResponse.data.alerts],
        },
      });

      render(<TestComponent {...tableProps} />);
      await waitFor(() => {
        expect(useBulkGetMaintenanceWindowsMock).toHaveBeenCalledWith(
          expect.objectContaining({
            ids: ['test-mw-id-1', 'test-mw-id-2'],
            canFetchMaintenanceWindows: true,
          })
        );
      });
    });

    it('should skip alerts with empty maintenance window ids', async () => {
      mockUseSearchAlertsQuery.mockReturnValue({
        ...searchAlertsResponse,
        data: {
          ...searchAlertsResponse.data,
          alerts: [
            { ...searchAlertsResponse.data.alerts[0], 'kibana.alert.maintenance_window_ids': [] },
            searchAlertsResponse.data.alerts[1],
          ],
        },
      });

      render(<TestComponent {...tableProps} />);
      await waitFor(() => {
        expect(useBulkGetMaintenanceWindowsMock).toHaveBeenCalledWith(
          expect.objectContaining({
            ids: ['test-mw-id-2'],
            canFetchMaintenanceWindows: true,
          })
        );
      });
    });

    it('should show loading skeleton when fetching maintenance windows', async () => {
      useBulkGetMaintenanceWindowsMock.mockReturnValue({
        data: maintenanceWindowsMap,
        isFetching: true,
      });

      render(<TestComponent {...tableProps} />);
      expect((await screen.findAllByTestId('maintenance-window-cell-loading')).length).toBe(1);
    });

    it('should not fetch maintenance windows if the user does not have permission', async () => {});

    it('should not fetch maintenance windows if the column is not visible', async () => {
      render(
        <TestComponent
          {...tableProps}
          columns={[
            {
              id: AlertsField.name,
              displayAsText: 'Name',
            },
          ]}
        />
      );
      await waitFor(() => {
        expect(useBulkGetMaintenanceWindowsMock).toHaveBeenCalledWith(
          expect.objectContaining({
            ids: ['test-mw-id-2'],
            canFetchMaintenanceWindows: false,
          })
        );
      });
    });
  });

  describe('Alerts table configuration registry', () => {
    it('should read the configuration from the registry', async () => {
      render(<TestComponent {...tableProps} />);
      expect(hasMock).toHaveBeenCalledWith(PLUGIN_ID);
      expect(getMock).toHaveBeenCalledWith(PLUGIN_ID);
      expect(updateMock).toBeCalledTimes(3);
    });

    it('should render an empty error state when the plugin id owner is not registered', async () => {
      const props = { ...tableProps, configurationId: 'none' };
      const result = render(<TestComponent {...props} />);
      expect(result.getByTestId('alertsTableNoConfiguration')).toBeTruthy();
    });
  });

  describe('flyout', () => {
    it('should show a flyout when selecting an alert', async () => {
      const wrapper = render(<TestComponent {...tableProps} />);
      userEvent.click(wrapper.queryAllByTestId('expandColumnCellOpenFlyoutButton-0')[0]!);

      const result = await wrapper.findAllByTestId('alertsFlyout');
      expect(result.length).toBe(1);

      expect(wrapper.queryByTestId('alertsFlyoutName')?.textContent).toBe('one');
      expect(wrapper.queryByTestId('alertsFlyoutReason')?.textContent).toBe('two');

      // Should paginate too
      userEvent.click(wrapper.queryAllByTestId('pagination-button-next')[0]);
      expect(wrapper.queryByTestId('alertsFlyoutName')?.textContent).toBe('three');
      expect(wrapper.queryByTestId('alertsFlyoutReason')?.textContent).toBe('four');

      userEvent.click(wrapper.queryAllByTestId('pagination-button-previous')[0]);
      expect(wrapper.queryByTestId('alertsFlyoutName')?.textContent).toBe('one');
      expect(wrapper.queryByTestId('alertsFlyoutReason')?.textContent).toBe('two');
    });

    it('should refetch data if flyout pagination exceeds the current page', async () => {
      const wrapper = render(
        <TestComponent
          {...{
            ...tableProps,
            initialPageSize: 1,
          }}
        />
      );

      userEvent.click(wrapper.queryAllByTestId('expandColumnCellOpenFlyoutButton-0')[0]!);
      const result = await wrapper.findAllByTestId('alertsFlyout');
      expect(result.length).toBe(1);

      mockUseSearchAlertsQuery.mockClear();

      userEvent.click(wrapper.queryAllByTestId('pagination-button-next')[0]);
      expect(mockUseSearchAlertsQuery).toHaveBeenCalledWith(
        expect.objectContaining({
          pageIndex: 1,
          pageSize: 1,
        })
      );

      mockUseSearchAlertsQuery.mockClear();
      userEvent.click(wrapper.queryAllByTestId('pagination-button-previous')[0]);
      expect(mockUseSearchAlertsQuery).toHaveBeenCalledWith(
        expect.objectContaining({
          pageIndex: 0,
          pageSize: 1,
        })
      );
    });

    it('Should be able to go back from last page to n - 1', async () => {
      const wrapper = render(
        <TestComponent
          {...{
            ...tableProps,
            initialPageSize: 2,
          }}
        />
      );

      userEvent.click(wrapper.queryAllByTestId('expandColumnCellOpenFlyoutButton-0')[0]!);
      const result = await wrapper.findAllByTestId('alertsFlyout');
      expect(result.length).toBe(1);

      mockUseSearchAlertsQuery.mockClear();

      userEvent.click(wrapper.queryAllByTestId('pagination-button-last')[0]);
      expect(mockUseSearchAlertsQuery).toHaveBeenCalledWith(
        expect.objectContaining({
          pageIndex: 1,
          pageSize: 2,
        })
      );

      mockUseSearchAlertsQuery.mockClear();
      userEvent.click(wrapper.queryAllByTestId('pagination-button-previous')[0]);
      expect(mockUseSearchAlertsQuery).toHaveBeenCalledWith(
        expect.objectContaining({
          pageIndex: 0,
          pageSize: 2,
        })
      );
    });
  });

  describe('field browser', () => {
    beforeEach(() => {
      jest.clearAllMocks();
      useBulkGetCasesMock.mockReturnValue({ data: new Map(), isFetching: false });
      useBulkGetMaintenanceWindowsMock.mockReturnValue({
        data: new Map(),
        isFetching: false,
      });
    });

    it('should show field browser', async () => {
      const { findByTestId } = render(<TestComponent {...tableProps} />);
      expect(await findByTestId('show-field-browser')).toBeInTheDocument();
    });

    it('should remove an already existing element when selected', async () => {
      const { getByTestId, queryByTestId } = render(<TestComponent {...tableProps} />);

      expect(queryByTestId(`dataGridHeaderCell-${AlertsField.name}`)).not.toBe(null);
      fireEvent.click(getByTestId('show-field-browser'));
      const fieldCheckbox = getByTestId(`field-${AlertsField.name}-checkbox`);
      fireEvent.click(fieldCheckbox);
      fireEvent.click(getByTestId('close'));

      await waitFor(() => {
        expect(queryByTestId(`dataGridHeaderCell-${AlertsField.name}`)).toBe(null);
      });
    });

    it('should restore a default element that has been removed previously', async () => {
      mockStorage.mockClear();
      mockStorage.mockImplementation(() => ({
        get: () => {
          return {
            columns: [{ displayAsText: 'Reason', id: AlertsField.reason, schema: undefined }],
            sort: [
              {
                [AlertsField.reason]: {
                  order: 'asc',
                },
              },
            ],
            visibleColumns: [AlertsField.reason],
          };
        },
        set: jest.fn(),
      }));

      const { getByTestId, queryByTestId } = render(<TestComponent {...tableProps} />);

      expect(queryByTestId(`dataGridHeaderCell-${AlertsField.name}`)).toBe(null);
      fireEvent.click(getByTestId('show-field-browser'));
      const fieldCheckbox = getByTestId(`field-${AlertsField.name}-checkbox`);
      fireEvent.click(fieldCheckbox);
      fireEvent.click(getByTestId('close'));

      await waitFor(() => {
        expect(queryByTestId(`dataGridHeaderCell-${AlertsField.name}`)).not.toBe(null);
        const titles: string[] = [];
        getByTestId('dataGridHeader')
          .querySelectorAll('.euiDataGridHeaderCell__content')
          .forEach((n) => titles.push(n?.getAttribute('title') ?? ''));
        expect(titles).toContain('Name');
      });
    });

    it('should insert a new field as column when its not a default one', async () => {
      const { getByTestId, queryByTestId } = render(<TestComponent {...tableProps} />);

      expect(queryByTestId(`dataGridHeaderCell-${AlertsField.uuid}`)).toBe(null);
      fireEvent.click(getByTestId('show-field-browser'));
      const fieldCheckbox = getByTestId(`field-${AlertsField.uuid}-checkbox`);
      fireEvent.click(fieldCheckbox);
      fireEvent.click(getByTestId('close'));

      await waitFor(() => {
        expect(queryByTestId(`dataGridHeaderCell-${AlertsField.uuid}`)).not.toBe(null);
        expect(
          getByTestId('dataGridHeader')
            .querySelectorAll('.euiDataGridHeaderCell__content')[2]
            .getAttribute('title')
        ).toBe(AlertsField.uuid);
      });
    });
  });

  describe('persistent controls', () => {
    it('should show persistent controls if set', () => {
      const props = mockCustomProps({
        usePersistentControls: () => ({ right: <span>This is a persistent control</span> }),
      });
      const result = render(<TestComponent {...props} />);
      expect(result.getByText('This is a persistent control')).toBeInTheDocument();
    });
  });

  describe('inspect button', () => {
    it('should hide the inspect button by default', () => {
      render(<TestComponent {...tableProps} />);
      expect(screen.queryByTestId('inspect-icon-button')).not.toBeInTheDocument();
    });

    it('should show the inspect button if the right prop is set', async () => {
      const props = mockCustomProps({
        showInspectButton: true,
      });
      render(<TestComponent {...props} />);
      expect(await screen.findByTestId('inspect-icon-button')).toBeInTheDocument();
    });
  });

  describe('empty state', () => {
    beforeEach(() => {
      refetchMock.mockClear();
      mockUseSearchAlertsQuery.mockReturnValue({
        data: {
          alerts: [],
          total: 0,
          querySnapshot: { request: [], response: [] },
        },
        refetch: refetchMock,
      });
    });

    it('should render an empty screen if there are no alerts', async () => {
      const result = render(<TestComponent {...tableProps} />);
      expect(result.getByTestId('alertsStateTableEmptyState')).toBeTruthy();
    });

    describe('inspect button', () => {
      it('should hide the inspect button by default', () => {
        render(<TestComponent {...tableProps} />);
        expect(screen.queryByTestId('inspect-icon-button')).not.toBeInTheDocument();
      });

      it('should show the inspect button if the right prop is set', async () => {
        const props = mockCustomProps({ showInspectButton: true });
        render(<TestComponent {...props} />);
        expect(await screen.findByTestId('inspect-icon-button')).toBeInTheDocument();
      });
    });

    describe('when persisten controls are set', () => {
      const props = mockCustomProps({
        usePersistentControls: () => ({ right: <span>This is a persistent control</span> }),
      });

      it('should show persistent controls if set', () => {
        const result = render(<TestComponent {...props} />);
        expect(result.getByText('This is a persistent control')).toBeInTheDocument();
      });
    });
  });

  describe('Client provided toolbar visiblity options', () => {
    it('hide column order control', () => {
      const customTableProps: AlertsTableStateProps = {
        ...tableProps,
        toolbarVisibility: { showColumnSelector: false },
      };

      render(<TestComponent {...customTableProps} />);

      expect(screen.queryByTestId('dataGridColumnSelectorButton')).not.toBeInTheDocument();
    });
    it('hide sort Selection', () => {
      const customTableProps: AlertsTableStateProps = {
        ...tableProps,
        toolbarVisibility: { showSortSelector: false },
      };

      render(<TestComponent {...customTableProps} />);

      expect(screen.queryByTestId('dataGridColumnSortingButton')).not.toBeInTheDocument();
    });
  });

  describe('Pagination', () => {
    it('resets the page index when any query parameter changes', () => {
      mockUseSearchAlertsQuery.mockReturnValue({
        ...searchAlertsResponse,
        alerts: Array.from({ length: 100 }).map((_, i) => ({ [AlertsField.uuid]: `alert-${i}` })),
      });
      const { rerender } = render(<TestComponent {...tableProps} />);
      act(() => {
        onPageChange({ pageIndex: 1, pageSize: 50 });
      });
      rerender(
        <TestComponent
          {...tableProps}
          query={{ bool: { filter: [{ term: { 'kibana.alert.rule.name': 'test' } }] } }}
        />
      );
      expect(mockUseSearchAlertsQuery).toHaveBeenLastCalledWith(
        expect.objectContaining({ pageIndex: 0 })
      );
    });

    it('resets the page index when refetching alerts', () => {
      mockUseSearchAlertsQuery.mockReturnValue({
        ...searchAlertsResponse,
        alerts: Array.from({ length: 100 }).map((_, i) => ({ [AlertsField.uuid]: `alert-${i}` })),
      });
      render(<TestComponent {...tableProps} />);
      act(() => {
        onPageChange({ pageIndex: 1, pageSize: 50 });
      });
      act(() => {
        refetchAlerts();
      });
      expect(mockUseSearchAlertsQuery).toHaveBeenLastCalledWith(
        expect.objectContaining({ pageIndex: 0 })
      );
    });
  });
});
