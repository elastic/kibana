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
import { fireEvent, render, waitFor, screen } from '@testing-library/react';
import { AlertConsumers, ALERT_CASE_IDS } from '@kbn/rule-data-utils';
import { Storage } from '@kbn/kibana-utils-plugin/public';

import {
  Alerts,
  AlertsField,
  AlertsTableConfigurationRegistry,
  AlertsTableFlyoutBaseProps,
  FetchAlertData,
} from '../../../types';
import { PLUGIN_ID } from '../../../common/constants';
import { TypeRegistry } from '../../type_registry';
import AlertsTableState, { AlertsTableStateProps } from './alerts_table_state';
import { useFetchAlerts } from './hooks/use_fetch_alerts';
import { useFetchBrowserFieldCapabilities } from './hooks/use_fetch_browser_fields_capabilities';
import { useBulkGetCases } from './hooks/use_bulk_get_cases';
import { DefaultSort } from './hooks';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { BrowserFields } from '@kbn/rule-registry-plugin/common';
import { getCasesMockMap } from './cases/index.mock';

jest.mock('./hooks/use_fetch_alerts');
jest.mock('./hooks/use_fetch_browser_fields_capabilities');
jest.mock('./hooks/use_bulk_get_cases');

jest.mock('@kbn/kibana-utils-plugin/public');

const mockCurrentAppId$ = new BehaviorSubject<string>('testAppId');

jest.mock('@kbn/kibana-react-plugin/public', () => ({
  useKibana: () => ({
    services: {
      application: {
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
      cases: {
        ui: {
          getCasesContext: () => null,
        },
        helpers: {
          getUICapabilities: () => ({
            all: true,
            read: true,
            create: true,
            update: true,
            delete: true,
            push: true,
          }),
        },
      },
      notifications: {
        toasts: {
          addDanger: () => {},
        },
      },
    },
  }),
}));

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
];

const alerts = [
  {
    [AlertsField.name]: ['one'],
    [AlertsField.reason]: ['two'],
    [AlertsField.uuid]: ['1047d115-670d-469e-af7a-86fdd2b2f814'],
    [ALERT_CASE_IDS]: ['test-id'],
  },
  {
    [AlertsField.name]: ['three'],
    [AlertsField.reason]: ['four'],
    [AlertsField.uuid]: ['bf5f6d63-5afd-48e0-baf6-f28c2b68db46'],
    [ALERT_CASE_IDS]: ['test-id-2'],
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
      getRenderCellValue: () =>
        jest.fn().mockImplementation((props) => {
          return `${props.colIndex}:${props.rowIndex}`;
        }),
    };
  }
  return {};
});
const alertsTableConfigurationRegistryMock = {
  has: hasMock,
  get: getMock,
} as unknown as TypeRegistry<AlertsTableConfigurationRegistry>;

const storageMock = Storage as jest.Mock;

storageMock.mockImplementation(() => {
  return { get: jest.fn(), set: jest.fn() };
});

const refetchMock = jest.fn();
const hookUseFetchAlerts = useFetchAlerts as jest.Mock;
const fetchAlertsResponse = {
  alerts,
  isInitializing: false,
  getInspectQuery: jest.fn(),
  refetch: refetchMock,
  totalAlerts: alerts.length,
  ecsAlertsData,
  oldAlertsData,
};

hookUseFetchAlerts.mockReturnValue([false, fetchAlertsResponse]);

const hookUseFetchBrowserFieldCapabilities = useFetchBrowserFieldCapabilities as jest.Mock;
hookUseFetchBrowserFieldCapabilities.mockImplementation(() => [false, {}]);

const casesMap = getCasesMockMap();
const useBulkGetCasesMock = useBulkGetCases as jest.Mock;

const AlertsTableWithLocale: React.FunctionComponent<AlertsTableStateProps> = (props) => (
  <IntlProvider locale="en">
    <AlertsTableState {...props} />
  </IntlProvider>
);

describe('AlertsTableState', () => {
  const tableProps = {
    alertsTableConfigurationRegistry: alertsTableConfigurationRegistryMock,
    configurationId: PLUGIN_ID,
    id: `test-alerts`,
    featureIds: [AlertConsumers.LOGS],
    query: {},
    showExpandToDetails: true,
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
    } as unknown as TypeRegistry<AlertsTableConfigurationRegistry>;

    return {
      ...tableProps,
      alertsTableConfigurationRegistry: alertsTableConfigurationRegistryWithPersistentControlsMock,
    };
  };

  beforeEach(() => {
    jest.clearAllMocks();

    useBulkGetCasesMock.mockReturnValue({ data: casesMap, isLoading: false });
  });

  describe('cases column', () => {
    it('should show the cases column', async () => {
      render(<AlertsTableWithLocale {...tableProps} />);
      expect(await screen.findByText('Cases')).toBeInTheDocument();
    });

    it('should show the cases titles correctly', async () => {
      render(<AlertsTableWithLocale {...tableProps} />);
      expect(await screen.findByText('Test case')).toBeInTheDocument();
      expect(await screen.findByText('Test case 2')).toBeInTheDocument();
    });

    it('should pass the correct case ids to useBulkGetCases', async () => {
      render(<AlertsTableWithLocale {...tableProps} />);

      await waitFor(() => {
        expect(useBulkGetCasesMock).toHaveBeenCalledWith(['test-id', 'test-id-2']);
      });
    });

    it('remove duplicated case ids', async () => {
      hookUseFetchAlerts.mockReturnValue([
        false,
        {
          ...fetchAlertsResponse,
          alerts: [...fetchAlertsResponse.alerts, ...fetchAlertsResponse.alerts],
        },
      ]);

      render(<AlertsTableWithLocale {...tableProps} />);

      await waitFor(() => {
        expect(useBulkGetCasesMock).toHaveBeenCalledWith(['test-id', 'test-id-2']);
      });
    });

    it('skips alerts with empty case ids', async () => {
      hookUseFetchAlerts.mockReturnValue([
        false,
        {
          ...fetchAlertsResponse,
          alerts: [
            { ...fetchAlertsResponse.alerts[0], 'kibana.alert.case_ids': [] },
            fetchAlertsResponse.alerts[1],
          ],
        },
      ]);

      render(<AlertsTableWithLocale {...tableProps} />);

      await waitFor(() => {
        expect(useBulkGetCasesMock).toHaveBeenCalledWith(['test-id-2']);
      });
    });
  });

  describe('Alerts table configuration registry', () => {
    it('should read the configuration from the registry', async () => {
      render(<AlertsTableWithLocale {...tableProps} />);
      expect(hasMock).toHaveBeenCalledWith(PLUGIN_ID);
      expect(getMock).toHaveBeenCalledWith(PLUGIN_ID);
    });

    it('should render an empty error state when the plugin id owner is not registered', async () => {
      const props = { ...tableProps, configurationId: 'none' };
      const result = render(<AlertsTableWithLocale {...props} />);
      expect(result.getByTestId('alertsTableNoConfiguration')).toBeTruthy();
    });
  });

  describe('flyout', () => {
    it('should show a flyout when selecting an alert', async () => {
      const wrapper = render(<AlertsTableWithLocale {...tableProps} />);
      userEvent.click(wrapper.queryByTestId('expandColumnCellOpenFlyoutButton-0')!);

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
        <AlertsTableWithLocale
          {...{
            ...tableProps,
            pageSize: 1,
          }}
        />
      );

      userEvent.click(wrapper.queryByTestId('expandColumnCellOpenFlyoutButton-0')!);
      const result = await wrapper.findAllByTestId('alertsFlyout');
      expect(result.length).toBe(1);

      hookUseFetchAlerts.mockClear();

      userEvent.click(wrapper.queryAllByTestId('pagination-button-next')[0]);
      expect(hookUseFetchAlerts).toHaveBeenCalledWith(
        expect.objectContaining({
          pagination: {
            pageIndex: 1,
            pageSize: 1,
          },
        })
      );

      hookUseFetchAlerts.mockClear();
      userEvent.click(wrapper.queryAllByTestId('pagination-button-previous')[0]);
      expect(hookUseFetchAlerts).toHaveBeenCalledWith(
        expect.objectContaining({
          pagination: {
            pageIndex: 0,
            pageSize: 1,
          },
        })
      );
    });
  });

  describe('field browser', () => {
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

    beforeEach(() => {
      hookUseFetchBrowserFieldCapabilities.mockClear();
      hookUseFetchBrowserFieldCapabilities.mockImplementation(() => [true, browserFields]);
    });

    it('should show field browser', () => {
      const { queryByTestId } = render(<AlertsTableWithLocale {...tableProps} />);
      expect(queryByTestId('show-field-browser')).not.toBe(null);
    });

    it('should remove an already existing element when selected', async () => {
      const { getByTestId, queryByTestId } = render(<AlertsTableWithLocale {...tableProps} />);

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
      storageMock.mockClear();
      storageMock.mockImplementation(() => ({
        get: () => {
          return {
            columns: [{ displayAsText: 'Reason', id: 'kibana.alert.reason', schema: undefined }],
            sort: [],
            visibleColumns: ['kibana.alert.reason'],
          };
        },
        set: jest.fn(),
      }));

      const { getByTestId, queryByTestId } = render(<AlertsTableWithLocale {...tableProps} />);

      expect(queryByTestId(`dataGridHeaderCell-${AlertsField.name}`)).toBe(null);
      fireEvent.click(getByTestId('show-field-browser'));
      const fieldCheckbox = getByTestId(`field-${AlertsField.name}-checkbox`);
      fireEvent.click(fieldCheckbox);
      fireEvent.click(getByTestId('close'));

      await waitFor(() => {
        expect(queryByTestId(`dataGridHeaderCell-${AlertsField.name}`)).not.toBe(null);
        expect(
          getByTestId('dataGridHeader')
            .querySelectorAll('.euiDataGridHeaderCell__content')[1]
            .getAttribute('title')
        ).toBe('Name');
      });
    });

    it('should insert a new field as column when its not a default one', async () => {
      const { getByTestId, queryByTestId } = render(<AlertsTableWithLocale {...tableProps} />);

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
      const result = render(<AlertsTableWithLocale {...props} />);
      expect(result.getByText('This is a persistent control')).toBeInTheDocument();
    });
  });

  describe('inspect button', () => {
    it('should hide the inspect button by default', () => {
      render(<AlertsTableWithLocale {...tableProps} />);
      expect(screen.queryByTestId('inspect-icon-button')).not.toBeInTheDocument();
    });

    it('should show the inspect button if the right prop is set', async () => {
      const props = mockCustomProps({ showInspectButton: true });
      render(<AlertsTableWithLocale {...props} />);
      expect(await screen.findByTestId('inspect-icon-button')).toBeInTheDocument();
    });
  });

  describe('empty state', () => {
    beforeEach(() => {
      refetchMock.mockClear();
      hookUseFetchAlerts.mockImplementation(() => [
        false,
        {
          alerts: [],
          isInitializing: false,
          getInspectQuery: jest.fn(),
          refetch: refetchMock,
          totalAlerts: 0,
        },
      ]);
    });

    it('should render an empty screen if there are no alerts', async () => {
      const result = render(<AlertsTableWithLocale {...tableProps} />);
      expect(result.getByTestId('alertsStateTableEmptyState')).toBeTruthy();
    });

    describe('inspect button', () => {
      it('should hide the inspect button by default', () => {
        render(<AlertsTableWithLocale {...tableProps} />);
        expect(screen.queryByTestId('inspect-icon-button')).not.toBeInTheDocument();
      });

      it('should show the inspect button if the right prop is set', async () => {
        const props = mockCustomProps({ showInspectButton: true });
        render(<AlertsTableWithLocale {...props} />);
        expect(await screen.findByTestId('inspect-icon-button')).toBeInTheDocument();
      });
    });

    describe('when persisten controls are set', () => {
      const props = mockCustomProps({
        usePersistentControls: () => ({ right: <span>This is a persistent control</span> }),
      });

      it('should show persistent controls if set', () => {
        const result = render(<AlertsTableWithLocale {...props} />);
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

      render(<AlertsTableWithLocale {...customTableProps} />);

      expect(screen.queryByTestId('dataGridColumnSelectorButton')).not.toBeInTheDocument();
    });
    it('hide sort Selection', () => {
      const customTableProps: AlertsTableStateProps = {
        ...tableProps,
        toolbarVisibility: { showSortSelector: false },
      };

      render(<AlertsTableWithLocale {...customTableProps} />);

      expect(screen.queryByTestId('dataGridColumnSortingButton')).not.toBeInTheDocument();
    });
  });
});
