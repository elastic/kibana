/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import type { MemoryHistory } from 'history';
import { createMemoryHistory } from 'history';
import { ApmServicesTable, getServiceColumns } from './apm_services_table';
import { ENVIRONMENT_ALL } from '../../../../../common/environment_filter_values';
import type { Breakpoints } from '../../../../hooks/use_breakpoints';
import { apmRouter } from '../../../routing/apm_route_config';
import * as timeSeriesColor from '../../../shared/charts/helper/get_timeseries_color';
import { MockApmPluginContextWrapper } from '../../../../context/apm_plugin/mock_apm_plugin_context';
import { FETCH_STATUS } from '../../../../hooks/use_fetcher';
import { ServiceInventoryFieldName } from '../../../../../common/service_inventory';
import type { ServiceListItem } from '../../../../../common/service_inventory';
import { fromQuery } from '../../../shared/links/url_helpers';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';

jest.mock('../../../../hooks/use_breakpoints', () => ({
  useBreakpoints: () => ({
    isSmall: false,
    isLarge: false,
    isXl: false,
  }),
}));

jest.mock('../../../../hooks/use_fallback_to_transactions_fetcher', () => ({
  useFallbackToTransactionsFetcher: () => ({
    fallbackToTransactions: false,
  }),
}));

jest.mock('@kbn/kibana-react-plugin/public', () => {
  const original = jest.requireActual('@kbn/kibana-react-plugin/public');
  return {
    ...original,
    useKibana: () => ({
      services: {
        triggersActionsUi: {
          ruleTypeRegistry: {
            get: jest.fn(),
            list: jest.fn().mockReturnValue([]),
          },
          actionTypeRegistry: {
            get: jest.fn(),
            list: jest.fn().mockReturnValue([]),
          },
          getAddRuleFlyout: jest.fn().mockReturnValue(null),
        },
        slo: {
          getCreateSLOFormFlyout: jest.fn().mockReturnValue(null),
        },
        uiSettings: {
          get: jest.fn().mockReturnValue(false),
        },
      },
    }),
  };
});

jest.mock('../../../alerting/ui_components/alerting_flyout', () => ({
  AlertingFlyout: () => null,
}));

const mockUseServiceActions = jest.fn();
jest.mock('./service_actions', () => ({
  useServiceActions: () => mockUseServiceActions(),
}));

const defaultQuery = {
  rangeFrom: 'now-15m',
  rangeTo: 'now',
  environment: ENVIRONMENT_ALL.value,
  kuery: '',
  serviceGroup: '',
  comparisonEnabled: false,
};

const mockService: ServiceListItem = {
  serviceName: 'opbeans-python',
  agentName: 'python',
  transactionType: 'request',
  environments: ['test'],
  latency: 91535,
  throughput: 86.93,
  transactionErrorRate: 0.05,
};

const mockServices: ServiceListItem[] = [
  mockService,
  {
    serviceName: 'opbeans-java',
    agentName: 'java',
    transactionType: 'request',
    environments: ['production'],
    latency: 50000,
    throughput: 100,
    transactionErrorRate: 0.02,
  },
];

function createMockServiceActions({
  showActionsColumn = true,
  hasAlertActions = true,
  hasSloActions = true,
}: {
  showActionsColumn?: boolean;
  hasAlertActions?: boolean;
  hasSloActions?: boolean;
} = {}) {
  const actions = [];

  if (hasAlertActions) {
    actions.push({
      id: 'alerts',
      groupLabel: 'Alerts',
      actions: [
        {
          id: 'createThresholdRule',
          name: 'Create threshold rule',
          items: [
            { id: 'createLatencyRule', name: 'Latency', onClick: jest.fn() },
            {
              id: 'createFailedTransactionRateRule',
              name: 'Failed transaction rate',
              onClick: jest.fn(),
            },
          ],
        },
        { id: 'createAnomalyRule', name: 'Create anomaly rule', onClick: jest.fn() },
        { id: 'createErrorCountRule', name: 'Create error count rule', onClick: jest.fn() },
        { id: 'manageRules', name: 'Manage rules', icon: 'tableOfContents', onClick: jest.fn() },
      ],
    });
  }

  if (hasSloActions) {
    actions.push({
      id: 'slos',
      groupLabel: 'SLOs',
      actions: [
        { id: 'createLatencySlo', name: 'Create APM latency SLO', onClick: jest.fn() },
        { id: 'createAvailabilitySlo', name: 'Create APM availability SLO', onClick: jest.fn() },
        { id: 'manageSlos', name: 'Manage SLOs', icon: 'tableOfContents', onClick: jest.fn() },
      ],
    });
  }

  return { actions, showActionsColumn };
}

function renderApmServicesTable({
  history,
  services = mockServices,
  status = FETCH_STATUS.SUCCESS,
  displayHealthStatus = false,
  displayAlerts = false,
}: {
  history: MemoryHistory;
  services?: ServiceListItem[];
  status?: FETCH_STATUS;
  displayHealthStatus?: boolean;
  displayAlerts?: boolean;
}) {
  const defaultSortFn = (items: ServiceListItem[]) => items;

  return render(
    <IntlProvider locale="en">
      <MockApmPluginContextWrapper history={history}>
        <ApmServicesTable
          status={status}
          items={services}
          comparisonDataLoading={false}
          displayHealthStatus={displayHealthStatus}
          displayAlerts={displayAlerts}
          initialSortField={ServiceInventoryFieldName.ServiceName}
          initialPageSize={25}
          initialSortDirection="asc"
          sortFn={defaultSortFn}
          serviceOverflowCount={0}
          maxCountExceeded={false}
        />
      </MockApmPluginContextWrapper>
    </IntlProvider>
  );
}

describe('ApmServicesTable', () => {
  let history: MemoryHistory;

  beforeAll(() => {
    jest.spyOn(timeSeriesColor, 'getTimeSeriesColor').mockImplementation(() => ({
      currentPeriodColor: 'green',
      previousPeriodColor: 'black',
    }));
  });

  beforeEach(() => {
    history = createMemoryHistory();
    history.replace({
      pathname: '/services',
      search: fromQuery(defaultQuery),
    });
    mockUseServiceActions.mockReturnValue(createMockServiceActions());
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('rendering', () => {
    it('renders table with services', async () => {
      renderApmServicesTable({ history });

      expect(await screen.findByRole('table')).toBeInTheDocument();
      expect(screen.getByText('opbeans-python')).toBeInTheDocument();
      expect(screen.getByText('opbeans-java')).toBeInTheDocument();
    });

    it('renders table in loading state', async () => {
      renderApmServicesTable({ history, status: FETCH_STATUS.LOADING, services: [] });

      expect(await screen.findByRole('table')).toBeInTheDocument();
    });

    it('renders empty state when no services', async () => {
      renderApmServicesTable({
        history,
        services: [],
        status: FETCH_STATUS.SUCCESS,
      });

      expect(await screen.findByRole('table')).toBeInTheDocument();
    });

    it('shows max count exceeded warning when maxCountExceeded is true', async () => {
      const defaultSortFn = (items: ServiceListItem[]) => items;

      render(
        <IntlProvider locale="en">
          <MockApmPluginContextWrapper history={history}>
            <ApmServicesTable
              status={FETCH_STATUS.SUCCESS}
              items={mockServices}
              comparisonDataLoading={false}
              displayHealthStatus={false}
              displayAlerts={false}
              initialSortField={ServiceInventoryFieldName.ServiceName}
              initialPageSize={25}
              initialSortDirection="asc"
              sortFn={defaultSortFn}
              serviceOverflowCount={0}
              maxCountExceeded={true}
            />
          </MockApmPluginContextWrapper>
        </IntlProvider>
      );

      expect(await screen.findByRole('table')).toBeInTheDocument();
    });
  });

  describe('getServiceColumns', () => {
    it('returns correct number of columns with all features enabled', () => {
      const columns = getServiceColumns({
        comparisonDataLoading: false,
        showHealthStatusColumn: true,
        query: defaultQuery,
        showTransactionTypeColumn: true,
        breakpoints: { isSmall: true, isLarge: false, isXl: false } as Breakpoints,
        showAlertsColumn: true,
        link: apmRouter.link,
        serviceOverflowCount: 0,
      });

      expect(columns.length).toBe(8);
    });

    it('hides health column when showHealthStatusColumn is false', () => {
      const columns = getServiceColumns({
        comparisonDataLoading: false,
        showHealthStatusColumn: false,
        query: defaultQuery,
        showTransactionTypeColumn: true,
        breakpoints: { isSmall: true, isLarge: false, isXl: false } as Breakpoints,
        showAlertsColumn: true,
        link: apmRouter.link,
        serviceOverflowCount: 0,
      });

      const hasHealthColumn = columns.some((c) => c.field === 'healthStatus');
      expect(hasHealthColumn).toBe(false);
    });

    it('hides alerts column when showAlertsColumn is false', () => {
      const columns = getServiceColumns({
        comparisonDataLoading: false,
        showHealthStatusColumn: true,
        query: defaultQuery,
        showTransactionTypeColumn: true,
        breakpoints: { isSmall: true, isLarge: false, isXl: false } as Breakpoints,
        showAlertsColumn: false,
        link: apmRouter.link,
        serviceOverflowCount: 0,
      });

      const hasAlertsColumn = columns.some((c) => c.field === 'alertsCount');
      expect(hasAlertsColumn).toBe(false);
    });

    it('hides transaction type column when showTransactionTypeColumn is false', () => {
      const columns = getServiceColumns({
        comparisonDataLoading: false,
        showHealthStatusColumn: true,
        query: defaultQuery,
        showTransactionTypeColumn: false,
        breakpoints: { isSmall: true, isLarge: false, isXl: false } as Breakpoints,
        showAlertsColumn: true,
        link: apmRouter.link,
        serviceOverflowCount: 0,
      });

      const hasTransactionTypeColumn = columns.some((c) => c.field === 'transactionType');
      expect(hasTransactionTypeColumn).toBe(false);
    });

    it('hides environment column on large screens', () => {
      const columns = getServiceColumns({
        comparisonDataLoading: false,
        showHealthStatusColumn: true,
        query: defaultQuery,
        showTransactionTypeColumn: true,
        breakpoints: { isSmall: false, isLarge: true, isXl: false } as Breakpoints,
        showAlertsColumn: true,
        link: apmRouter.link,
        serviceOverflowCount: 0,
      });

      const hasEnvironmentColumn = columns.some((c) => c.field === 'environments');
      expect(hasEnvironmentColumn).toBe(false);
    });

    describe('responsive columns', () => {
      const serviceForColumnTest: any = {
        serviceName: 'opbeans-python',
        agentName: 'python',
        transactionsPerMinute: {
          value: 86.93333333333334,
          timeseries: [],
        },
        errorsPerMinute: {
          value: 12.6,
          timeseries: [],
        },
        avgResponseTime: {
          value: 91535.42944785276,
          timeseries: [],
        },
        environments: ['test'],
        transactionType: 'request',
      };

      describe('when small', () => {
        it('shows environment, transaction type and sparklines', () => {
          const renderedColumns = getServiceColumns({
            comparisonDataLoading: false,
            showHealthStatusColumn: true,
            query: defaultQuery,
            showTransactionTypeColumn: true,
            breakpoints: {
              isSmall: true,
              isLarge: true,
              isXl: true,
            } as Breakpoints,
            showAlertsColumn: true,
            link: apmRouter.link,
            serviceOverflowCount: 0,
          }).map((c) =>
            c.render
              ? c.render!(serviceForColumnTest[c.field!], serviceForColumnTest)
              : serviceForColumnTest[c.field!]
          );
          expect(renderedColumns.length).toEqual(8);
          expect(renderedColumns[3]).toMatchInlineSnapshot(`
            <EnvironmentBadge
              environments={
                Array [
                  "test",
                ]
              }
            />
          `);
          expect(renderedColumns[4]).toMatchInlineSnapshot(`"request"`);
          expect(renderedColumns[5]).toMatchInlineSnapshot(`
            <ListMetric
              color="green"
              comparisonSeriesColor="black"
              hideSeries={false}
              isLoading={false}
              valueLabel="0 ms"
            />
          `);
        });
      });

      describe('when Large', () => {
        it('hides environment, transaction type and sparklines', () => {
          const renderedColumns = getServiceColumns({
            comparisonDataLoading: false,
            showHealthStatusColumn: true,
            query: defaultQuery,
            showTransactionTypeColumn: true,
            breakpoints: {
              isSmall: false,
              isLarge: true,
              isXl: true,
            } as Breakpoints,
            showAlertsColumn: true,
            link: apmRouter.link,
            serviceOverflowCount: 0,
          }).map((c) =>
            c.render
              ? c.render!(serviceForColumnTest[c.field!], serviceForColumnTest)
              : serviceForColumnTest[c.field!]
          );
          expect(renderedColumns.length).toEqual(6);
          expect(renderedColumns[3]).toMatchInlineSnapshot(`
            <ListMetric
              color="green"
              comparisonSeriesColor="black"
              hideSeries={true}
              isLoading={false}
              valueLabel="0 ms"
            />
          `);
        });
      });

      describe('when XL', () => {
        it('hides transaction type', () => {
          const renderedColumns = getServiceColumns({
            comparisonDataLoading: false,
            showHealthStatusColumn: true,
            query: defaultQuery,
            showTransactionTypeColumn: true,
            breakpoints: {
              isSmall: false,
              isLarge: false,
              isXl: true,
            } as Breakpoints,
            showAlertsColumn: true,
            link: apmRouter.link,
            serviceOverflowCount: 0,
          }).map((c) =>
            c.render
              ? c.render!(serviceForColumnTest[c.field!], serviceForColumnTest)
              : serviceForColumnTest[c.field!]
          );
          expect(renderedColumns.length).toEqual(7);
          expect(renderedColumns[3]).toMatchInlineSnapshot(`
            <EnvironmentBadge
              environments={
                Array [
                  "test",
                ]
              }
            />
          `);
          expect(renderedColumns[4]).toMatchInlineSnapshot(`
            <ListMetric
              color="green"
              comparisonSeriesColor="black"
              hideSeries={false}
              isLoading={false}
              valueLabel="0 ms"
            />
          `);
        });
      });

      describe('when XXL', () => {
        it('shows all columns including transaction type', () => {
          const renderedColumns = getServiceColumns({
            comparisonDataLoading: false,
            showHealthStatusColumn: true,
            query: defaultQuery,
            showTransactionTypeColumn: true,
            breakpoints: {
              isSmall: false,
              isLarge: false,
              isXl: false,
            } as Breakpoints,
            showAlertsColumn: true,
            link: apmRouter.link,
            serviceOverflowCount: 0,
          }).map((c) =>
            c.render
              ? c.render!(serviceForColumnTest[c.field!], serviceForColumnTest)
              : serviceForColumnTest[c.field!]
          );
          expect(renderedColumns.length).toEqual(8);
          expect(renderedColumns[3]).toMatchInlineSnapshot(`
            <EnvironmentBadge
              environments={
                Array [
                  "test",
                ]
              }
            />
          `);
          expect(renderedColumns[4]).toMatchInlineSnapshot(`"request"`);
          expect(renderedColumns[5]).toMatchInlineSnapshot(`
            <ListMetric
              color="green"
              comparisonSeriesColor="black"
              hideSeries={false}
              isLoading={false}
              valueLabel="0 ms"
            />
          `);
        });
      });
    });
  });

  describe('actions column', () => {
    it('renders actions column when user has alert permissions', async () => {
      mockUseServiceActions.mockReturnValue(
        createMockServiceActions({
          showActionsColumn: true,
          hasAlertActions: true,
          hasSloActions: false,
        })
      );

      renderApmServicesTable({ history });

      expect(await screen.findByRole('table')).toBeInTheDocument();
      expect(screen.getByText('Actions')).toBeInTheDocument();
    });

    it('renders actions column when user has SLO permissions', async () => {
      mockUseServiceActions.mockReturnValue(
        createMockServiceActions({
          showActionsColumn: true,
          hasAlertActions: false,
          hasSloActions: true,
        })
      );

      renderApmServicesTable({ history });

      expect(await screen.findByRole('table')).toBeInTheDocument();
      expect(screen.getByText('Actions')).toBeInTheDocument();
    });

    it('does not render actions column when user has no permissions', async () => {
      mockUseServiceActions.mockReturnValue(
        createMockServiceActions({
          showActionsColumn: false,
          hasAlertActions: false,
          hasSloActions: false,
        })
      );

      renderApmServicesTable({ history });

      expect(await screen.findByRole('table')).toBeInTheDocument();
      expect(screen.queryByText('Actions')).not.toBeInTheDocument();
    });

    it('opens actions menu when clicking action button', async () => {
      mockUseServiceActions.mockReturnValue(
        createMockServiceActions({
          showActionsColumn: true,
          hasAlertActions: true,
          hasSloActions: true,
        })
      );

      renderApmServicesTable({ history });

      await screen.findByRole('table');

      const actionButtons = screen.getAllByTestId('apmManagedTableActionsCellButton');
      expect(actionButtons.length).toBeGreaterThan(0);

      fireEvent.click(actionButtons[0]);

      await waitFor(() => {
        expect(screen.getByTestId('apmManagedTableActionsMenuGroup-alerts')).toBeInTheDocument();
        expect(screen.getByTestId('apmManagedTableActionsMenuGroup-slos')).toBeInTheDocument();
      });
    });

    it('shows alert actions when user has alert permissions', async () => {
      mockUseServiceActions.mockReturnValue(
        createMockServiceActions({
          showActionsColumn: true,
          hasAlertActions: true,
          hasSloActions: false,
        })
      );

      renderApmServicesTable({ history });

      await screen.findByRole('table');

      const actionButtons = screen.getAllByTestId('apmManagedTableActionsCellButton');
      fireEvent.click(actionButtons[0]);

      await waitFor(() => {
        expect(screen.getByTestId('apmManagedTableActionsMenuGroup-alerts')).toBeInTheDocument();
        expect(
          screen.getByTestId('apmManagedTableActionsMenuItem-createThresholdRule')
        ).toBeInTheDocument();
        expect(
          screen.getByTestId('apmManagedTableActionsMenuItem-createAnomalyRule')
        ).toBeInTheDocument();
        expect(
          screen.getByTestId('apmManagedTableActionsMenuItem-createErrorCountRule')
        ).toBeInTheDocument();
        expect(
          screen.getByTestId('apmManagedTableActionsMenuItem-manageRules')
        ).toBeInTheDocument();
      });
    });

    it('shows SLO actions when user has SLO permissions', async () => {
      mockUseServiceActions.mockReturnValue(
        createMockServiceActions({
          showActionsColumn: true,
          hasAlertActions: false,
          hasSloActions: true,
        })
      );

      renderApmServicesTable({ history });

      await screen.findByRole('table');

      const actionButtons = screen.getAllByTestId('apmManagedTableActionsCellButton');
      fireEvent.click(actionButtons[0]);

      await waitFor(() => {
        expect(screen.getByTestId('apmManagedTableActionsMenuGroup-slos')).toBeInTheDocument();
        expect(
          screen.getByTestId('apmManagedTableActionsMenuItem-createLatencySlo')
        ).toBeInTheDocument();
        expect(
          screen.getByTestId('apmManagedTableActionsMenuItem-createAvailabilitySlo')
        ).toBeInTheDocument();
        expect(screen.getByTestId('apmManagedTableActionsMenuItem-manageSlos')).toBeInTheDocument();
      });
    });
  });

  describe('sorting', () => {
    it('allows sorting by service name', async () => {
      renderApmServicesTable({ history });

      await screen.findByRole('table');

      const nameHeader = screen.getByText('Name');
      expect(nameHeader).toBeInTheDocument();
    });

    it('allows sorting by latency', async () => {
      renderApmServicesTable({ history });

      await screen.findByRole('table');

      const latencyHeader = screen.getByText('Latency (avg.)');
      expect(latencyHeader).toBeInTheDocument();
    });

    it('allows sorting by throughput', async () => {
      renderApmServicesTable({ history });

      await screen.findByRole('table');

      const throughputHeader = screen.getByText('Throughput');
      expect(throughputHeader).toBeInTheDocument();
    });

    it('allows sorting by failed transaction rate', async () => {
      renderApmServicesTable({ history });

      await screen.findByRole('table');

      const errorRateHeader = screen.getByText('Failed transaction rate');
      expect(errorRateHeader).toBeInTheDocument();
    });
  });

  describe('alerts column', () => {
    it('renders alerts column when displayAlerts is true', async () => {
      renderApmServicesTable({ history, displayAlerts: true });

      await screen.findByRole('table');

      expect(screen.getByText('Alerts')).toBeInTheDocument();
    });

    it('does not render alerts column when displayAlerts is false', async () => {
      renderApmServicesTable({ history, displayAlerts: false });

      await screen.findByRole('table');

      const alertsHeaders = screen.queryAllByText('Alerts');
      const alertsColumnHeader = alertsHeaders.find((el) => el.closest('th') !== null);
      expect(alertsColumnHeader).toBeUndefined();
    });

    it('renders alert badge when service has alerts', async () => {
      const servicesWithAlerts: ServiceListItem[] = [
        {
          ...mockService,
          alertsCount: 3,
        },
      ];

      renderApmServicesTable({ history, services: servicesWithAlerts, displayAlerts: true });

      await screen.findByRole('table');

      expect(screen.getByTestId('serviceInventoryAlertsBadgeLink')).toBeInTheDocument();
      expect(screen.getByText('3')).toBeInTheDocument();
    });
  });

  describe('health column', () => {
    it('renders health column when displayHealthStatus is true', async () => {
      renderApmServicesTable({ history, displayHealthStatus: true });

      await screen.findByRole('table');

      expect(screen.getByText('Health')).toBeInTheDocument();
    });

    it('does not render health column when displayHealthStatus is false', async () => {
      renderApmServicesTable({ history, displayHealthStatus: false });

      await screen.findByRole('table');

      expect(screen.queryByText('Health')).not.toBeInTheDocument();
    });
  });
});
