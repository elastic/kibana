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
import { SLO_COUNT_CAP } from '../../../shared/slo_status_badge';
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

const mockKibanaServices = {
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
  apmSourcesAccess: {
    getApmIndexSettings: jest.fn().mockResolvedValue({ apmIndexSettings: [] }),
  },
};

jest.mock('@kbn/kibana-react-plugin/public', () => {
  const original = jest.requireActual('@kbn/kibana-react-plugin/public');
  return {
    ...original,
    useKibana: () => ({
      services: mockKibanaServices,
    }),
  };
});

jest.mock('../../../alerting/ui_components/alerting_flyout', () => ({
  AlertingFlyout: () => null,
}));

jest.mock('../../../shared/slo_overview_flyout', () => ({
  SloOverviewFlyout: ({ serviceName }: { serviceName: string }) => (
    <div data-test-subj="sloOverviewFlyout">SLO Overview Flyout for {serviceName}</div>
  ),
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
  hasDiscoverActions = true,
  hasAlertActions = true,
  hasSloActions = true,
}: {
  hasDiscoverActions?: boolean;
  hasAlertActions?: boolean;
  hasSloActions?: boolean;
} = {}) {
  const actions = [];

  if (hasDiscoverActions) {
    actions.push({
      id: 'discover',
      actions: [
        {
          id: 'servicesTable-openTracesInDiscover',
          name: 'Open traces in Discover',
          href: jest.fn().mockReturnValue('http://discover/traces'),
        },
        {
          id: 'servicesTable-openLogsInDiscover',
          name: 'Open logs in Discover',
          href: jest.fn().mockReturnValue('http://discover/logs'),
        },
      ],
    });
  }

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

  return actions;
}

function renderApmServicesTable({
  history,
  services = mockServices,
  status = FETCH_STATUS.SUCCESS,
  displayHealthStatus = false,
  displayAlerts = false,
  displaySlos = false,
}: {
  history: MemoryHistory;
  services?: ServiceListItem[];
  status?: FETCH_STATUS;
  displayHealthStatus?: boolean;
  displayAlerts?: boolean;
  displaySlos?: boolean;
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
          displaySlos={displaySlos}
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
              displaySlos={false}
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
        showSlosColumn: true,
        link: apmRouter.link,
        serviceOverflowCount: 0,
        onSloBadgeClick: jest.fn(),
      });

      expect(columns.length).toBe(9);
    });

    it('hides health column when showHealthStatusColumn is false', () => {
      const columns = getServiceColumns({
        comparisonDataLoading: false,
        showHealthStatusColumn: false,
        query: defaultQuery,
        showTransactionTypeColumn: true,
        breakpoints: { isSmall: true, isLarge: false, isXl: false } as Breakpoints,
        showAlertsColumn: true,
        showSlosColumn: false,
        link: apmRouter.link,
        serviceOverflowCount: 0,
        onSloBadgeClick: jest.fn(),
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
        showSlosColumn: false,
        link: apmRouter.link,
        serviceOverflowCount: 0,
        onSloBadgeClick: jest.fn(),
      });

      const hasAlertsColumn = columns.some((c) => c.field === 'alertsCount');
      expect(hasAlertsColumn).toBe(false);
    });

    it('hides SLOs column when showSlosColumn is false', () => {
      const columns = getServiceColumns({
        comparisonDataLoading: false,
        showHealthStatusColumn: true,
        query: defaultQuery,
        showTransactionTypeColumn: true,
        breakpoints: { isSmall: true, isLarge: false, isXl: false } as Breakpoints,
        showAlertsColumn: true,
        showSlosColumn: false,
        link: apmRouter.link,
        serviceOverflowCount: 0,
        onSloBadgeClick: jest.fn(),
      });

      const hasSlosColumn = columns.some((c) => c.field === 'sloStatus');
      expect(hasSlosColumn).toBe(false);
    });

    it('shows SLOs column when showSlosColumn is true', () => {
      const columns = getServiceColumns({
        comparisonDataLoading: false,
        showHealthStatusColumn: true,
        query: defaultQuery,
        showTransactionTypeColumn: true,
        breakpoints: { isSmall: true, isLarge: false, isXl: false } as Breakpoints,
        showAlertsColumn: true,
        showSlosColumn: true,
        link: apmRouter.link,
        serviceOverflowCount: 0,
        onSloBadgeClick: jest.fn(),
      });

      const hasSlosColumn = columns.some((c) => c.field === 'sloStatus');
      expect(hasSlosColumn).toBe(true);
    });

    it('hides transaction type column when showTransactionTypeColumn is false', () => {
      const columns = getServiceColumns({
        comparisonDataLoading: false,
        showHealthStatusColumn: true,
        query: defaultQuery,
        showTransactionTypeColumn: false,
        breakpoints: { isSmall: true, isLarge: false, isXl: false } as Breakpoints,
        showAlertsColumn: true,
        showSlosColumn: false,
        link: apmRouter.link,
        serviceOverflowCount: 0,
        onSloBadgeClick: jest.fn(),
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
        showSlosColumn: false,
        link: apmRouter.link,
        serviceOverflowCount: 0,
        onSloBadgeClick: jest.fn(),
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
            showSlosColumn: false,
            link: apmRouter.link,
            serviceOverflowCount: 0,
            onSloBadgeClick: jest.fn(),
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
            showSlosColumn: false,
            link: apmRouter.link,
            serviceOverflowCount: 0,
            onSloBadgeClick: jest.fn(),
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
            showSlosColumn: false,
            link: apmRouter.link,
            serviceOverflowCount: 0,
            onSloBadgeClick: jest.fn(),
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
            showSlosColumn: false,
            link: apmRouter.link,
            serviceOverflowCount: 0,
            onSloBadgeClick: jest.fn(),
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
    it('renders actions column', async () => {
      mockUseServiceActions.mockReturnValue(createMockServiceActions());

      renderApmServicesTable({ history });

      expect(await screen.findByRole('table')).toBeInTheDocument();
      expect(screen.getByText('Actions')).toBeInTheDocument();
    });

    it('opens actions menu when clicking action button', async () => {
      mockUseServiceActions.mockReturnValue(
        createMockServiceActions({
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
        expect(
          screen.getByTestId('apmManagedTableActionsMenuItem-servicesTable-openTracesInDiscover')
        ).toBeInTheDocument();
        expect(
          screen.getByTestId('apmManagedTableActionsMenuItem-servicesTable-openLogsInDiscover')
        ).toBeInTheDocument();
        expect(screen.getByTestId('apmManagedTableActionsMenuGroup-alerts')).toBeInTheDocument();
        expect(screen.getByTestId('apmManagedTableActionsMenuGroup-slos')).toBeInTheDocument();
      });
    });

    it('shows alert actions when user has alert permissions', async () => {
      mockUseServiceActions.mockReturnValue(
        createMockServiceActions({
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

    it('shows Discover actions in the menu', async () => {
      mockUseServiceActions.mockReturnValue(
        createMockServiceActions({
          hasDiscoverActions: true,
          hasAlertActions: false,
          hasSloActions: false,
        })
      );

      renderApmServicesTable({ history });

      await screen.findByRole('table');

      const actionButtons = screen.getAllByTestId('apmManagedTableActionsCellButton');
      fireEvent.click(actionButtons[0]);

      await waitFor(() => {
        expect(
          screen.getByTestId('apmManagedTableActionsMenuItem-servicesTable-openTracesInDiscover')
        ).toBeInTheDocument();
        expect(
          screen.getByTestId('apmManagedTableActionsMenuItem-servicesTable-openLogsInDiscover')
        ).toBeInTheDocument();
      });
    });

    it('always shows Discover actions alongside alert and SLO actions', async () => {
      mockUseServiceActions.mockReturnValue(
        createMockServiceActions({
          hasDiscoverActions: true,
          hasAlertActions: true,
          hasSloActions: true,
        })
      );

      renderApmServicesTable({ history });

      await screen.findByRole('table');

      const actionButtons = screen.getAllByTestId('apmManagedTableActionsCellButton');
      fireEvent.click(actionButtons[0]);

      await waitFor(() => {
        expect(
          screen.getByTestId('apmManagedTableActionsMenuItem-servicesTable-openTracesInDiscover')
        ).toBeInTheDocument();
        expect(
          screen.getByTestId('apmManagedTableActionsMenuItem-servicesTable-openLogsInDiscover')
        ).toBeInTheDocument();
        expect(screen.getByTestId('apmManagedTableActionsMenuGroup-alerts')).toBeInTheDocument();
        expect(screen.getByTestId('apmManagedTableActionsMenuGroup-slos')).toBeInTheDocument();
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

  describe('SLOs column', () => {
    it('renders SLOs column when displaySlos is true', async () => {
      renderApmServicesTable({ history, displaySlos: true });

      await screen.findByRole('table');

      expect(screen.getByText('SLOs')).toBeInTheDocument();
    });

    it('does not render SLOs column when displaySlos is false', async () => {
      renderApmServicesTable({ history, displaySlos: false });

      await screen.findByRole('table');

      expect(screen.queryByText('SLOs')).not.toBeInTheDocument();
    });

    it('renders violated SLO badge when service has violated SLOs', async () => {
      const servicesWithSlos: ServiceListItem[] = [
        {
          ...mockService,
          sloStatus: 'violated',
          sloCount: 2,
        },
      ];

      renderApmServicesTable({ history, services: servicesWithSlos, displaySlos: true });

      await screen.findByRole('table');

      expect(screen.getByTestId('serviceInventorySloViolatedBadge')).toBeInTheDocument();
      expect(screen.getByText('2 Violated')).toBeInTheDocument();
    });

    it('renders degrading SLO badge when service has degrading SLOs', async () => {
      const servicesWithSlos: ServiceListItem[] = [
        {
          ...mockService,
          sloStatus: 'degrading',
          sloCount: 3,
        },
      ];

      renderApmServicesTable({ history, services: servicesWithSlos, displaySlos: true });

      await screen.findByRole('table');

      expect(screen.getByTestId('serviceInventorySloDegradingBadge')).toBeInTheDocument();
      expect(screen.getByText('3 Degrading')).toBeInTheDocument();
    });

    it('renders healthy SLO badge when all SLOs are healthy', async () => {
      const servicesWithSlos: ServiceListItem[] = [
        {
          ...mockService,
          sloStatus: 'healthy',
          sloCount: 5,
        },
      ];

      renderApmServicesTable({ history, services: servicesWithSlos, displaySlos: true });

      await screen.findByRole('table');

      expect(screen.getByTestId('serviceInventorySloHealthyBadge')).toBeInTheDocument();
      expect(screen.getByText('Healthy')).toBeInTheDocument();
    });

    it('renders no data SLO badge when SLOs have no data', async () => {
      const servicesWithSlos: ServiceListItem[] = [
        {
          ...mockService,
          sloStatus: 'noData',
          sloCount: 1,
        },
      ];

      renderApmServicesTable({ history, services: servicesWithSlos, displaySlos: true });

      await screen.findByRole('table');

      expect(screen.getByTestId('serviceInventorySloNoDataBadge')).toBeInTheDocument();
      expect(screen.getByText('No data')).toBeInTheDocument();
    });

    it('does not render SLO badge when service has no SLO status', async () => {
      const servicesWithoutSlos: ServiceListItem[] = [
        {
          ...mockService,
          sloStatus: undefined,
          sloCount: undefined,
        },
      ];

      renderApmServicesTable({ history, services: servicesWithoutSlos, displaySlos: true });

      await screen.findByRole('table');

      expect(screen.queryByTestId('serviceInventorySloViolatedBadge')).not.toBeInTheDocument();
      expect(screen.queryByTestId('serviceInventorySloDegradingBadge')).not.toBeInTheDocument();
      expect(screen.queryByTestId('serviceInventorySloHealthyBadge')).not.toBeInTheDocument();
      expect(screen.queryByTestId('serviceInventorySloNoDataBadge')).not.toBeInTheDocument();
    });

    it('opens SLO overview flyout when clicking SLO badge', async () => {
      const servicesWithSlos: ServiceListItem[] = [
        {
          ...mockService,
          sloStatus: 'violated',
          sloCount: 2,
        },
      ];

      renderApmServicesTable({ history, services: servicesWithSlos, displaySlos: true });

      await screen.findByRole('table');

      const sloBadge = screen.getByTestId('serviceInventorySloViolatedBadge');
      fireEvent.click(sloBadge);

      await waitFor(() => {
        expect(screen.getByTestId('sloOverviewFlyout')).toBeInTheDocument();
      });
    });

    describe('SLO count capping', () => {
      it(`displays exact count when violated SLO count is less than ${SLO_COUNT_CAP}`, async () => {
        const servicesWithSlos: ServiceListItem[] = [
          {
            ...mockService,
            sloStatus: 'violated',
            sloCount: SLO_COUNT_CAP - 1,
          },
        ];

        renderApmServicesTable({ history, services: servicesWithSlos, displaySlos: true });

        await screen.findByRole('table');

        expect(screen.getByText(`${SLO_COUNT_CAP - 1} Violated`)).toBeInTheDocument();
      });

      it(`displays ${SLO_COUNT_CAP}+ when violated SLO count equals ${SLO_COUNT_CAP}`, async () => {
        const servicesWithSlos: ServiceListItem[] = [
          {
            ...mockService,
            sloStatus: 'violated',
            sloCount: SLO_COUNT_CAP,
          },
        ];

        renderApmServicesTable({ history, services: servicesWithSlos, displaySlos: true });

        await screen.findByRole('table');

        expect(screen.getByText(`${SLO_COUNT_CAP}+ Violated`)).toBeInTheDocument();
      });

      it(`displays ${SLO_COUNT_CAP}+ when violated SLO count exceeds ${SLO_COUNT_CAP}`, async () => {
        const servicesWithSlos: ServiceListItem[] = [
          {
            ...mockService,
            sloStatus: 'violated',
            sloCount: SLO_COUNT_CAP + 50,
          },
        ];

        renderApmServicesTable({ history, services: servicesWithSlos, displaySlos: true });

        await screen.findByRole('table');

        expect(screen.getByText(`${SLO_COUNT_CAP}+ Violated`)).toBeInTheDocument();
      });

      it(`displays exact count when degrading SLO count is less than ${SLO_COUNT_CAP}`, async () => {
        const servicesWithSlos: ServiceListItem[] = [
          {
            ...mockService,
            sloStatus: 'degrading',
            sloCount: SLO_COUNT_CAP - 1,
          },
        ];

        renderApmServicesTable({ history, services: servicesWithSlos, displaySlos: true });

        await screen.findByRole('table');

        expect(screen.getByText(`${SLO_COUNT_CAP - 1} Degrading`)).toBeInTheDocument();
      });

      it(`displays ${SLO_COUNT_CAP}+ when degrading SLO count exceeds ${SLO_COUNT_CAP}`, async () => {
        const servicesWithSlos: ServiceListItem[] = [
          {
            ...mockService,
            sloStatus: 'degrading',
            sloCount: SLO_COUNT_CAP + 899,
          },
        ];

        renderApmServicesTable({ history, services: servicesWithSlos, displaySlos: true });

        await screen.findByRole('table');

        expect(screen.getByText(`${SLO_COUNT_CAP}+ Degrading`)).toBeInTheDocument();
      });

      it('does not display count for healthy status regardless of sloCount', async () => {
        const servicesWithSlos: ServiceListItem[] = [
          {
            ...mockService,
            sloStatus: 'healthy',
            sloCount: SLO_COUNT_CAP + 400,
          },
        ];

        renderApmServicesTable({ history, services: servicesWithSlos, displaySlos: true });

        await screen.findByRole('table');

        expect(screen.getByText('Healthy')).toBeInTheDocument();
        expect(screen.queryByText(`${SLO_COUNT_CAP + 400} Healthy`)).not.toBeInTheDocument();
        expect(screen.queryByText(`${SLO_COUNT_CAP}+ Healthy`)).not.toBeInTheDocument();
      });

      it('does not display count for noData status regardless of sloCount', async () => {
        const servicesWithSlos: ServiceListItem[] = [
          {
            ...mockService,
            sloStatus: 'noData',
            sloCount: SLO_COUNT_CAP + 100,
          },
        ];

        renderApmServicesTable({ history, services: servicesWithSlos, displaySlos: true });

        await screen.findByRole('table');

        expect(screen.getByText('No data')).toBeInTheDocument();
        expect(screen.queryByText(`${SLO_COUNT_CAP + 100} No data`)).not.toBeInTheDocument();
        expect(screen.queryByText(`${SLO_COUNT_CAP}+ No data`)).not.toBeInTheDocument();
      });
    });
  });
});
