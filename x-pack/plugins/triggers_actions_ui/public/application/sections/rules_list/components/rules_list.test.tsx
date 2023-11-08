/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as React from 'react';
import {
  fireEvent,
  render,
  screen,
  waitFor,
  waitForElementToBeRemoved,
  cleanup,
} from '@testing-library/react';

import { fetchActiveMaintenanceWindows } from '@kbn/alerts-ui-shared/src/maintenance_window_callout/api';
import { RUNNING_MAINTENANCE_WINDOW_1 } from '@kbn/alerts-ui-shared/src/maintenance_window_callout/mock';
import { actionTypeRegistryMock } from '../../../action_type_registry.mock';
import { ruleTypeRegistryMock } from '../../../rule_type_registry.mock';
import { percentileFields, RulesList } from './rules_list';
import {
  ActionTypeRegistryContract,
  Percentiles,
  RuleTypeModel,
  RuleTypeRegistryContract,
} from '../../../../types';
import { getIsExperimentalFeatureEnabled } from '../../../../common/get_experimental_features';
import { useKibana } from '../../../../common/lib/kibana';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { IToasts } from '@kbn/core/public';
import { CreateRuleButton } from './create_rule_button';
import { RulesListDocLink } from './rules_list_doc_link';
import { RulesSettingsLink } from '../../../components/rules_setting/rules_settings_link';

import {
  mockedRulesData,
  ruleTypeFromApi,
  ruleType,
  getDisabledByLicenseRuleTypeFromApi,
} from './test_helpers';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MAINTENANCE_WINDOW_FEATURE_ID, parseDuration } from '@kbn/alerting-plugin/common';
import { getFormattedDuration } from '../../../lib/monitoring_utils';

jest.mock('../../../../common/lib/kibana');
jest.mock('@kbn/kibana-react-plugin/public/ui_settings/use_ui_setting', () => ({
  useUiSetting: jest.fn(() => false),
  useUiSetting$: jest.fn((value: string) => ['0,0']),
}));
jest.mock('../../../lib/action_connector_api', () => ({
  loadActionTypes: jest.fn(),
  loadAllActions: jest.fn(),
}));

jest.mock('../../../lib/rule_api/rules_kuery_filter', () => ({
  loadRulesWithKueryFilter: jest.fn(),
}));
jest.mock('../../../lib/rule_api/rule_types', () => ({
  loadRuleTypes: jest.fn(),
}));
jest.mock('../../../lib/rule_api/aggregate_kuery_filter', () => ({
  loadRuleAggregationsWithKueryFilter: jest.fn(),
}));
jest.mock('../../../lib/rule_api/update_api_key', () => ({
  updateAPIKey: jest.fn(),
}));
jest.mock('../../../lib/rule_api/aggregate', () => ({
  loadRuleTags: jest.fn(),
}));
jest.mock('../../../lib/rule_api/snooze', () => ({
  bulkSnoozeRules: jest.fn(),
}));
jest.mock('../../../lib/rule_api/unsnooze', () => ({
  bulkUnsnoozeRules: jest.fn(),
}));
jest.mock('../../../lib/rule_api/bulk_delete', () => ({
  bulkDeleteRules: jest.fn().mockResolvedValue({ errors: [], total: 10 }),
}));
jest.mock('../../../lib/rule_api/update_api_key', () => ({
  bulkUpdateAPIKey: jest.fn(),
}));
jest.mock('../../../lib/rule_api/health', () => ({
  alertingFrameworkHealth: jest.fn(() => ({
    isSufficientlySecure: true,
    hasPermanentEncryptionKey: true,
  })),
}));

jest.mock('../../../lib/rule_api/aggregate_kuery_filter');
jest.mock('../../../lib/rule_api/rules_kuery_filter');

jest.mock('../../../../common/lib/health_api', () => ({
  triggersActionsUiHealth: jest.fn(() => ({ isRulesAvailable: true })),
}));
jest.mock('../../../../common/lib/config_api', () => ({
  triggersActionsUiConfig: jest
    .fn()
    .mockResolvedValue({ minimumScheduleInterval: { value: '1m', enforce: false } }),
}));
jest.mock('react-router-dom', () => ({
  useHistory: () => ({
    push: jest.fn(),
  }),
  useLocation: () => ({
    pathname: '/triggersActions/rules/',
  }),
}));

jest.mock('@kbn/alerts-ui-shared/src/maintenance_window_callout/api', () => ({
  fetchActiveMaintenanceWindows: jest.fn(() => Promise.resolve([])),
}));
const fetchActiveMaintenanceWindowsMock = fetchActiveMaintenanceWindows as jest.Mock;

jest.mock('../../../lib/capabilities', () => ({
  hasAllPrivilege: jest.fn(() => true),
  hasSaveRulesCapability: jest.fn(() => true),
  hasShowActionsCapability: jest.fn(() => true),
  hasExecuteActionsCapability: jest.fn(() => true),
}));
jest.mock('../../../../common/get_experimental_features', () => ({
  getIsExperimentalFeatureEnabled: jest.fn(),
}));

const ruleTags = ['a', 'b', 'c', 'd'];

const { loadRuleTypes } = jest.requireMock('../../../lib/rule_api/rule_types');
const { bulkUpdateAPIKey } = jest.requireMock('../../../lib/rule_api/update_api_key');
const { loadRuleTags } = jest.requireMock('../../../lib/rule_api/aggregate');

const { loadRuleAggregationsWithKueryFilter } = jest.requireMock(
  '../../../lib/rule_api/aggregate_kuery_filter'
);
const { loadRulesWithKueryFilter } = jest.requireMock('../../../lib/rule_api/rules_kuery_filter');
const { loadActionTypes, loadAllActions } = jest.requireMock('../../../lib/action_connector_api');

const useKibanaMock = useKibana as jest.Mocked<typeof useKibana>;
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      cacheTime: 0,
    },
  },
});

const AllTheProviders = ({ children }: { children: any }) => (
  <IntlProvider locale="en">
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  </IntlProvider>
);

const renderWithProviders = (ui: any) => {
  return render(ui, { wrapper: AllTheProviders });
};

describe('Update Api Key', () => {
  const addSuccess = jest.fn();
  const addError = jest.fn();
  const addDanger = jest.fn();

  beforeAll(() => {
    fetchActiveMaintenanceWindowsMock.mockResolvedValue([]);
    loadRulesWithKueryFilter.mockResolvedValue({
      page: 1,
      perPage: 10000,
      total: 0,
      data: mockedRulesData,
    });
    loadActionTypes.mockResolvedValue([]);
    loadRuleTypes.mockResolvedValue([ruleTypeFromApi]);
    loadAllActions.mockResolvedValue([]);
    useKibanaMock().services.application.capabilities = {
      ...useKibanaMock().services.application.capabilities,
      [MAINTENANCE_WINDOW_FEATURE_ID]: {
        save: true,
        show: true,
      },
    };
    useKibanaMock().services.notifications.toasts = {
      addSuccess,
      addError,
      addDanger,
    } as unknown as IToasts;
    useKibanaMock().services.unifiedSearch.ui.SearchBar = () => <></>;
    loadRuleTags.mockResolvedValue({
      data: [],
      page: 1,
      perPage: 50,
      total: 0,
    });
    loadRuleAggregationsWithKueryFilter.mockResolvedValue({});
  });

  afterEach(() => {
    jest.clearAllMocks();
    queryClient.clear();
    cleanup();
  });

  it('Have the option to update API key', async () => {
    bulkUpdateAPIKey.mockResolvedValueOnce({ errors: [], total: 1, rules: [], skipped: [] });
    renderWithProviders(<RulesList />);

    expect(await screen.findByText('test rule ok')).toBeInTheDocument();

    fireEvent.click((await screen.findAllByTestId('selectActionButton'))[1]);
    expect(screen.getByTestId('collapsedActionPanel')).toBeInTheDocument();

    expect(screen.queryByText('Update API key')).toBeInTheDocument();
  });
});

describe('rules_list component empty', () => {
  beforeEach(() => {
    fetchActiveMaintenanceWindowsMock.mockResolvedValue([]);
    loadRulesWithKueryFilter.mockResolvedValue({
      page: 1,
      perPage: 10000,
      total: 0,
      data: [],
    });
    loadActionTypes.mockResolvedValue([
      {
        id: 'test',
        name: 'Test',
      },
      {
        id: 'test2',
        name: 'Test2',
      },
    ]);
    loadRuleTypes.mockResolvedValue([ruleTypeFromApi]);
    loadAllActions.mockResolvedValue([]);
    loadRuleAggregationsWithKueryFilter.mockResolvedValue({});
    loadRuleTags.mockResolvedValue({
      data: ruleTags,
      page: 1,
      perPage: 50,
      total: 4,
    });

    const actionTypeRegistry = actionTypeRegistryMock.create();
    const ruleTypeRegistry = ruleTypeRegistryMock.create();

    ruleTypeRegistry.list.mockReturnValue([ruleType]);
    actionTypeRegistry.list.mockReturnValue([]);
    useKibanaMock().services.application.capabilities = {
      ...useKibanaMock().services.application.capabilities,
      [MAINTENANCE_WINDOW_FEATURE_ID]: {
        save: true,
        show: true,
      },
    };
    useKibanaMock().services.ruleTypeRegistry = ruleTypeRegistry;
    useKibanaMock().services.actionTypeRegistry = actionTypeRegistry;
  });

  afterEach(() => {
    jest.clearAllMocks();
    queryClient.clear();
    cleanup();
  });

  it('renders empty list', async () => {
    renderWithProviders(<RulesList />);
    expect(await screen.findByTestId('createFirstRuleEmptyPrompt')).toBeInTheDocument();
  });

  it('renders MaintenanceWindowCallout if one exists', async () => {
    fetchActiveMaintenanceWindowsMock.mockResolvedValue([RUNNING_MAINTENANCE_WINDOW_1]);
    renderWithProviders(<RulesList />);
    expect(
      await screen.findByText(
        'Rule notifications are stopped while maintenance windows are running.'
      )
    ).toBeInTheDocument();
    expect(fetchActiveMaintenanceWindowsMock).toHaveBeenCalledTimes(1);
  });

  it("hides MaintenanceWindowCallout if filterConsumers does not match the running maintenance window's category", async () => {
    fetchActiveMaintenanceWindowsMock.mockResolvedValue([
      { ...RUNNING_MAINTENANCE_WINDOW_1, categoryIds: ['securitySolution'] },
    ]);
    renderWithProviders(<RulesList filterConsumers={['observability']} />);
    await expect(
      screen.findByText('Rule notifications are stopped while maintenance windows are running.')
    ).rejects.toThrow();
    expect(fetchActiveMaintenanceWindowsMock).toHaveBeenCalledTimes(1);
  });

  it('renders Create rule button', async () => {
    renderWithProviders(<RulesList showCreateRuleButtonInPrompt />);

    const createRuleEl = await screen.findByText('Create rule');
    expect(screen.queryByTestId('addRuleFlyoutTitle')).not.toBeInTheDocument();

    fireEvent.click(createRuleEl);

    expect(await screen.findByTestId('addRuleFlyoutTitle')).toBeInTheDocument();
  });
});

describe('rules_list ', () => {
  let ruleTypeRegistry: jest.Mocked<RuleTypeRegistryContract>;
  let actionTypeRegistry: jest.Mocked<ActionTypeRegistryContract<unknown, unknown>>;
  beforeEach(() => {
    (getIsExperimentalFeatureEnabled as jest.Mock<any, any>).mockImplementation(() => false);
    loadRulesWithKueryFilter.mockResolvedValue({
      page: 1,
      perPage: 10000,
      total: 4,
      data: mockedRulesData,
    });
    loadActionTypes.mockResolvedValue([
      {
        id: 'test',
        name: 'Test',
      },
      {
        id: 'test2',
        name: 'Test2',
      },
    ]);
    loadRuleTypes.mockResolvedValue([ruleTypeFromApi]);
    loadAllActions.mockResolvedValue([]);
    loadRuleAggregationsWithKueryFilter.mockResolvedValue({
      ruleEnabledStatus: { enabled: 2, disabled: 0 },
      ruleExecutionStatus: { ok: 1, active: 2, error: 3, pending: 4, unknown: 5, warning: 6 },
      ruleMutedStatus: { muted: 0, unmuted: 2 },
      ruleTags,
      ruleLastRunOutcome: {
        succeeded: 3,
        failed: 3,
        warning: 6,
      },
    });
    loadRuleTags.mockResolvedValue({
      data: [],
      page: 1,
      perPage: 50,
      total: 0,
    });

    const ruleTypeMock: RuleTypeModel = {
      id: 'test_rule_type',
      iconClass: 'test',
      description: 'Rule when testing',
      documentationUrl: 'https://localhost.local/docs',
      validate: () => {
        return { errors: {} };
      },
      ruleParamsExpression: jest.fn(),
      requiresAppContext: false,
    };

    actionTypeRegistry = actionTypeRegistryMock.create();
    ruleTypeRegistry = ruleTypeRegistryMock.create();

    ruleTypeRegistry.has.mockReturnValue(true);
    ruleTypeRegistry.get.mockReturnValue(ruleTypeMock);
    useKibanaMock().services.ruleTypeRegistry = ruleTypeRegistry;
    useKibanaMock().services.actionTypeRegistry = actionTypeRegistry;
  });

  afterEach(() => {
    jest.clearAllMocks();
    queryClient.clear();
    cleanup();
  });

  it('can filter by rule states', async () => {
    (getIsExperimentalFeatureEnabled as jest.Mock<any, any>).mockImplementation(() => true);
    const onStatusFilterChangeMock = jest.fn();
    renderWithProviders(
      <RulesList statusFilter={['disabled']} onStatusFilterChange={onStatusFilterChangeMock} />
    );
    await waitForElementToBeRemoved(() => screen.queryByTestId('centerJustifiedSpinner'));
    expect(loadRulesWithKueryFilter).toHaveBeenLastCalledWith(
      expect.objectContaining({
        ruleStatusesFilter: ['disabled'],
      })
    );
    fireEvent.click((await screen.findAllByTestId('ruleStatusFilterButton'))[0]);
    fireEvent.click((await screen.findAllByTestId('ruleStatusFilterOption-enabled'))[0]);
    expect(loadRulesWithKueryFilter).toHaveBeenLastCalledWith(
      expect.objectContaining({
        ruleStatusesFilter: ['disabled', 'enabled'],
      })
    );
    expect(onStatusFilterChangeMock).toHaveBeenCalled();
    expect(onStatusFilterChangeMock).toHaveBeenLastCalledWith(['disabled', 'enabled']);
  });

  it('can filter by last response', async () => {
    const onLastRunOutcomeFilterChangeMock = jest.fn();
    renderWithProviders(
      <RulesList
        lastRunOutcomeFilter={['failed']}
        onLastRunOutcomeFilterChange={onLastRunOutcomeFilterChangeMock}
      />
    );
    fireEvent.click((await screen.findAllByTestId('ruleLastRunOutcomeFilterButton'))[0]);
    fireEvent.click((await screen.findAllByTestId('ruleLastRunOutcomesucceededFilterOption'))[0]);
    expect(onLastRunOutcomeFilterChangeMock).toHaveBeenLastCalledWith(['failed', 'succeeded']);
    expect(loadRulesWithKueryFilter).toHaveBeenLastCalledWith(
      expect.objectContaining({
        ruleLastRunOutcomesFilter: ['failed', 'succeeded'],
      })
    );
    await waitFor(() => screen.getByTestId('ruleLastRunOutcomeFilterButton'));
    fireEvent.click(screen.getAllByTestId('ruleLastRunOutcomeFilterButton')[0]);
    fireEvent.click(screen.getAllByTestId('ruleLastRunOutcomefailedFilterOption')[0]);
    expect(loadRulesWithKueryFilter).toHaveBeenLastCalledWith(
      expect.objectContaining({
        ruleLastRunOutcomesFilter: ['succeeded'],
      })
    );
    expect(onLastRunOutcomeFilterChangeMock).toHaveBeenLastCalledWith(['succeeded']);
  });

  describe('showActionFilter prop', () => {
    it('showActionFilter prop hides the ActionFilter component', async () => {
      renderWithProviders(<RulesList showActionFilter={false} />);
      await waitForElementToBeRemoved(() => screen.queryByTestId('centerJustifiedSpinner'));

      expect(screen.queryAllByText('Action type')).toHaveLength(0);
    });

    it('showActionFilter prop shows the ActionFilter component if no prop is passed', async () => {
      renderWithProviders(<RulesList />);
      expect(await screen.findAllByText('Action type')).toHaveLength(1);
    });

    it('showActionFilter prop filters when the action type filter is changed', async () => {
      renderWithProviders(<RulesList />);
      await waitFor(() => screen.getAllByTestId('actionTypeFilterButton')[0]);
      fireEvent.click(screen.getAllByTestId('actionTypeFilterButton')[0]);
      fireEvent.click(screen.getAllByTestId('actionTypetestFilterOption')[0]);
      // couldn't find better way, avoid using container! this is an exception
      expect(screen.getAllByRole('marquee', { name: '1 active filters' })).toHaveLength(1);
    });
  });

  describe('setHeaderActions', () => {
    it('should not render the Create Rule button', async () => {
      renderWithProviders(<RulesList />);
      await waitForElementToBeRemoved(() => screen.queryByTestId('centerJustifiedSpinner'));

      expect(screen.queryAllByTestId('createRuleButton')).toHaveLength(0);
    });

    it('should set header actions correctly when the user is authorized to create rules', async () => {
      const setHeaderActionsMock = jest.fn();
      renderWithProviders(<RulesList setHeaderActions={setHeaderActionsMock} />);

      await waitForElementToBeRemoved(() => screen.queryByTestId('centerJustifiedSpinner'));
      expect(setHeaderActionsMock.mock.lastCall[0][0].type).toEqual(CreateRuleButton);
      expect(setHeaderActionsMock.mock.lastCall[0][1].type).toEqual(RulesSettingsLink);
      expect(setHeaderActionsMock.mock.lastCall[0][2].type).toEqual(RulesListDocLink);
    });

    it('should set header actions correctly when the user is not authorized to creat rules', async () => {
      loadRuleTypes.mockResolvedValueOnce([]);
      const setHeaderActionsMock = jest.fn();
      renderWithProviders(<RulesList setHeaderActions={setHeaderActionsMock} />);

      await waitForElementToBeRemoved(() => screen.queryByTestId('centerJustifiedSpinner'));
      // Do not render the create rule button since the user is not authorized
      expect(setHeaderActionsMock.mock.lastCall[0][0].type).toEqual(RulesSettingsLink);
      expect(setHeaderActionsMock.mock.lastCall[0][1].type).toEqual(RulesListDocLink);
    });
  });

  // FLAKY: https://github.com/elastic/kibana/issues/149061
  describe.skip('rules_list component with items', () => {
    it('should render basic table and its row', async () => {
      renderWithProviders(<RulesList />);
      await waitFor(() => expect(screen.queryAllByTestId('rule-row')).toHaveLength(6));
    });

    it('Name and rule type column', async () => {
      renderWithProviders(<RulesList />);

      let ruleNameColumns: HTMLElement[] = [];
      await waitFor(() => {
        ruleNameColumns = screen.queryAllByTestId('rulesTableCell-name');
        return expect(ruleNameColumns).toHaveLength(mockedRulesData.length);
      });

      mockedRulesData.forEach((rule, index) => {
        expect(ruleNameColumns[index]).toHaveTextContent(`Name${rule.name}${ruleTypeFromApi.name}`);
      });
    });

    it('Tags column', async () => {
      renderWithProviders(<RulesList />);

      expect(await screen.findAllByTestId('rulesTableCell-tagsPopover')).toHaveLength(
        mockedRulesData.length
      );
      // only show tags popover if tags exist on rule
      expect(screen.queryAllByTestId('ruleTagBadge')).toHaveLength(
        mockedRulesData.filter((data) => data.tags.length > 0).length
      );
    });

    it('Last run column', async () => {
      renderWithProviders(<RulesList />);

      await waitFor(() =>
        expect(screen.queryAllByTestId('rulesTableCell-lastExecutionDate')).toHaveLength(
          mockedRulesData.length
        )
      );
    });

    it('Last run tooltip', async () => {
      renderWithProviders(<RulesList />);
      await waitForElementToBeRemoved(() => screen.queryByTestId('centerJustifiedSpinner'));

      await waitFor(() => screen.getAllByText('Last run')[0]);
      fireEvent.mouseOver(screen.getAllByText('Last run')[0]);

      expect(await screen.findByText('Start time of the last run.')).toBeInTheDocument();
    });

    it('Schedule interval column', async () => {
      renderWithProviders(<RulesList />);

      expect(await screen.findAllByTestId('rulesTableCell-interval')).toHaveLength(
        mockedRulesData.length
      );
    });

    it('Schedule minimum interval tooltip', async () => {
      renderWithProviders(<RulesList />);

      fireEvent.mouseOver(await screen.findByLabelText('Below configured minimum interval'));

      expect(
        await screen.findByText(
          'Rule interval of 1 second is below the minimum configured interval of 1 minute. This may impact alerting performance.'
        )
      ).toBeInTheDocument();
    });

    it('long duration tooltip', async () => {
      renderWithProviders(<RulesList />);

      // Duration column
      expect(await screen.findAllByTestId('rulesTableCell-duration')).toHaveLength(
        mockedRulesData.length
      );

      // show warning if duration is long
      await waitFor(() => screen.getAllByText('Info'));
      const durationWarningIcon = screen.getAllByText('Info');
      expect(durationWarningIcon).toHaveLength(
        mockedRulesData.filter(
          (data) =>
            data.executionStatus.lastDuration > parseDuration(ruleTypeFromApi.ruleTaskTimeout)
        ).length
      );
    });

    it('duration tooltip', async () => {
      renderWithProviders(<RulesList />);

      await waitFor(() => screen.getAllByText('Duration')[0]);
      fireEvent.mouseOver(screen.getAllByText('Duration')[0]);

      await waitFor(() =>
        expect(screen.getByRole('tooltip')).toHaveTextContent(
          'The length of time it took for the rule to run (mm:ss).'
        )
      );
    });

    it('Last response column', async () => {
      renderWithProviders(<RulesList />);

      expect(await screen.findAllByTestId('rulesTableCell-lastResponse')).toHaveLength(
        mockedRulesData.length
      );
      expect(screen.getAllByTestId('ruleStatus-succeeded')).toHaveLength(2);
      expect(screen.getAllByTestId('ruleStatus-failed')).toHaveLength(2);
      expect(screen.getAllByTestId('ruleStatus-warning')).toHaveLength(1);
      fireEvent.mouseOver(screen.getAllByTestId('ruleStatus-failed')[0]);

      expect((await screen.findAllByTestId('ruleStatus-error-tooltip'))[0]).toHaveTextContent(
        'Error: test'
      );
      expect(screen.getAllByTestId('rulesListAutoRefresh')[0]).toBeInTheDocument();
      expect(screen.getAllByTestId('ruleStatus-error-license-fix')).toHaveLength(1);
      expect(screen.getAllByTestId('ruleStatus-failed')[0]).toHaveTextContent('Failed');
      const failedElements = screen.getAllByTestId('ruleStatus-failed');
      expect(failedElements[failedElements.length - 1]).toHaveTextContent('License Error'); // last element
    });

    it('Status control column', async () => {
      renderWithProviders(<RulesList />);

      await waitFor(() => screen.getAllByTestId('rulesTableCell-status')[0]);
      expect(screen.getAllByTestId('rulesTableCell-status')).toHaveLength(mockedRulesData.length);
    });

    it('Monitoring column', async () => {
      renderWithProviders(<RulesList />);
      await waitFor(() => screen.getAllByTestId('rulesTableCell-successRatio')[0]);
      expect(screen.getAllByTestId('rulesTableCell-successRatio')).toHaveLength(
        mockedRulesData.length
      );

      const ratios = screen.getAllByTestId('successRatio');

      mockedRulesData.forEach((rule, index) => {
        if (rule.monitoring) {
          expect(ratios[index]).toHaveTextContent(
            `${rule.monitoring.run.calculated_metrics.success_ratio * 100}%`
          );
        } else {
          expect(ratios[index]).toHaveTextContent(`N/A`);
        }
      });
    });

    it('P50 column is rendered initially', async () => {
      renderWithProviders(<RulesList />);
      await waitFor(() =>
        expect(screen.getByTestId(`rulesTable-${Percentiles.P50}ColumnName`)).toBeDefined()
      );

      let percentiles: HTMLElement[] = [];
      await waitFor(() => {
        percentiles = Array.from(
          document.body.querySelectorAll(
            '[data-test-subj="rulesTableCell-ruleExecutionPercentile"] span[data-test-subj="rule-duration-format-value"]'
          )
        );
        return expect(percentiles.length).toBeGreaterThan(0);
      });

      fireEvent.mouseOver(percentiles[0]);
      expect(percentiles[0]).toHaveTextContent('03:20');
      expect(await screen.findByTestId('rule-duration-format-tooltip')).toHaveTextContent(
        '200,000 ms'
      );
      fireEvent.mouseLeave(percentiles[0]);

      fireEvent.mouseOver(percentiles[1]);
      expect(percentiles[1]).toHaveTextContent('00:00');
      expect(await screen.findByTestId('rule-duration-format-tooltip')).toHaveTextContent('0 ms');
      fireEvent.mouseLeave(percentiles[1]);

      fireEvent.mouseOver(percentiles[5]);
      expect(percentiles[1]).toHaveTextContent('00:00');
      expect(await screen.findByTestId('rule-duration-format-tooltip')).toHaveTextContent('N/A');
    });

    it('Click column to sort by P50', async () => {
      renderWithProviders(<RulesList />);
      const percentileEl: HTMLElement = await screen.findByTestId(
        `rulesTable-${Percentiles.P50}ColumnName`
      );

      fireEvent.click(percentileEl);
      expect(loadRulesWithKueryFilter).toHaveBeenLastCalledWith(
        expect.objectContaining({
          sort: {
            field: percentileFields[Percentiles.P50],
            direction: 'asc',
          },
        })
      );

      // Click column again to reverse sort by P50
      fireEvent.click(percentileEl);

      // broken because the table is rerendering on first and second   filter change
      expect(loadRulesWithKueryFilter).toHaveBeenLastCalledWith(
        expect.objectContaining({
          sort: {
            field: percentileFields[Percentiles.P50],
            direction: 'desc',
          },
        })
      );

      // Hover over percentile selection button
      fireEvent.click(screen.queryAllByTestId('percentileSelectablePopover-iconButton')[0]);

      // Percentile Selection
      await waitFor(() => expect(screen.getByTestId('percentileSelectablePopover-selectable')));

      const percentileOptions = screen.getAllByRole('option');
      expect(percentileOptions).toHaveLength(3);
    });

    it('Select P95', async () => {
      renderWithProviders(<RulesList />);
      const percentilePopoverButton = await screen.findByTitle('select percentile');
      fireEvent.click(percentilePopoverButton);

      await screen.findAllByTestId('percentileSelectablePopover-selectable');
      const options = screen.getAllByRole('option');
      fireEvent.click(options[1]);

      expect(
        screen.queryAllByTestId(`rulesTable-${Percentiles.P95}ColumnName`).length
      ).toBeGreaterThan(0);

      const percentiles: HTMLElement[] = Array.from(
        document.body.querySelectorAll(
          '[data-test-subj="rulesTableCell-ruleExecutionPercentile"] [data-test-subj="rule-duration-format-value"]'
        )
      );

      mockedRulesData.forEach((rule, index) => {
        if (typeof rule.monitoring?.run.calculated_metrics.p95 === 'number') {
          expect(percentiles[index]).toHaveTextContent(
            getFormattedDuration(rule.monitoring.run.calculated_metrics.p95)
          );
        } else {
          expect(percentiles[index]).toHaveTextContent('N/A');
        }
      });
    });

    it('Click column to sort by P95', async () => {
      renderWithProviders(<RulesList />);
      const percentilePopoverButton = await screen.findByTitle('select percentile');
      fireEvent.click(percentilePopoverButton);
      await screen.findAllByTestId('percentileSelectablePopover-selectable');
      const options = screen.getAllByRole('option');
      fireEvent.click(options[1]);

      const p95Column = await screen.findByTestId(`rulesTable-${Percentiles.P95}ColumnName`);
      fireEvent.click(p95Column);

      expect(loadRulesWithKueryFilter).toHaveBeenCalledWith(
        expect.objectContaining({
          sort: {
            field: percentileFields[Percentiles.P95],
            direction: 'asc',
          },
        })
      );

      // Click column again to reverse sort by P95
      fireEvent.click(screen.getByTestId(`rulesTable-${Percentiles.P95}ColumnName`));

      expect(loadRulesWithKueryFilter).toHaveBeenCalledWith(
        expect.objectContaining({
          sort: {
            field: percentileFields[Percentiles.P95],
            direction: 'desc',
          },
        })
      );
    });

    it('renders license errors and manage license modal on click', async () => {
      global.open = jest.fn();
      renderWithProviders(<RulesList />);
      await waitFor(() => screen.getByTestId('ruleStatus-error-license-fix'));
      fireEvent.click(screen.getByTestId('ruleStatus-error-license-fix'));

      expect(screen.queryAllByTestId('manageLicenseModal').length).toBeGreaterThan(0);
      expect(screen.getByTestId('confirmModalConfirmButton')).toHaveTextContent('Manage license');
      fireEvent.click(screen.getByTestId('confirmModalConfirmButton'));
      expect(global.open).toHaveBeenCalled();
    });

    it('sorts rules when clicking the name column', async () => {
      renderWithProviders(<RulesList />);

      const nameColumnTableHeaderEl = await screen.findByTestId('tableHeaderCell_name_1');
      const el = nameColumnTableHeaderEl.querySelector(
        '[data-test-subj="tableHeaderCell_name_1"] .euiTableHeaderButton'
      ) as HTMLElement;

      fireEvent.click(el);

      expect(loadRulesWithKueryFilter).toHaveBeenLastCalledWith(
        expect.objectContaining({
          sort: {
            field: 'name',
            direction: 'desc',
          },
        })
      );
    });

    it('sorts rules when clicking the status control column', async () => {
      renderWithProviders(<RulesList />);

      const enabledColumnTableHeaderEl = await screen.findByTestId('tableHeaderCell_enabled_10');
      const el = enabledColumnTableHeaderEl.querySelector(
        '[data-test-subj="tableHeaderCell_enabled_10"] .euiTableHeaderButton'
      ) as HTMLElement;

      fireEvent.click(el);

      expect(loadRulesWithKueryFilter).toHaveBeenLastCalledWith(
        expect.objectContaining({
          sort: {
            field: 'enabled',
            direction: 'asc',
          },
        })
      );
    });

    it('renders edit and delete buttons when user can manage rules', async () => {
      renderWithProviders(<RulesList />);
      await waitForElementToBeRemoved(() => screen.queryByTestId('centerJustifiedSpinner'));
      expect((await screen.findAllByTestId('ruleSidebarEditAction')).length).toBeGreaterThan(0);
      expect((await screen.findAllByTestId('ruleSidebarDeleteAction')).length).toBeGreaterThan(0);
    });

    it('does not render edit and delete button when rule type does not allow editing in rules management', async () => {
      const ruleTypeMock: RuleTypeModel = {
        id: 'test_rule_type',
        iconClass: 'test',
        description: 'Rule when testing',
        documentationUrl: 'https://localhost.local/docs',
        validate: () => {
          return { errors: {} };
        },
        ruleParamsExpression: jest.fn(),
        requiresAppContext: true,
      };

      ruleTypeRegistry.get.mockReturnValue(ruleTypeMock);
      renderWithProviders(<RulesList />);
      await waitForElementToBeRemoved(() => screen.queryByTestId('centerJustifiedSpinner'));
      expect(screen.queryByTestId('ruleSidebarEditAction')).not.toBeInTheDocument();
      expect((await screen.findAllByTestId('ruleSidebarDeleteAction')).length).toBeGreaterThan(0);
    });

    it('renders brief', async () => {
      renderWithProviders(<RulesList />);

      // ruleLastRunOutcome: {
      //   succeeded: 3,
      //   failed: 3,
      //   warning: 6,
      // }
      expect(await screen.findByTestId('totalSucceededRulesCount')).toHaveTextContent(
        'Succeeded: 3'
      );
      expect(await screen.findByTestId('totalFailedRulesCount')).toHaveTextContent('Failed: 3');
      expect(await screen.findByTestId('totalWarningRulesCount')).toHaveTextContent('Warning: 6');
    });

    it('does not render the status filter if the feature flag is off', async () => {
      renderWithProviders(<RulesList />);
      expect(screen.queryByTestId('ruleStatusFilter')).not.toBeInTheDocument();
    });

    it('renders the status filter if the experiment is on', async () => {
      (getIsExperimentalFeatureEnabled as jest.Mock<any, any>).mockImplementation(() => true);
      renderWithProviders(<RulesList />);
      await waitForElementToBeRemoved(() => screen.queryByTestId('centerJustifiedSpinner'));

      expect(screen.queryByTestId('ruleStatusFilter')).toBeInTheDocument();
    });

    it('can filter by rule states', async () => {
      (getIsExperimentalFeatureEnabled as jest.Mock<any, any>).mockImplementation(() => true);
      renderWithProviders(<RulesList />);
      await waitForElementToBeRemoved(() => screen.queryByTestId('centerJustifiedSpinner'));

      expect(loadRulesWithKueryFilter).toHaveBeenLastCalledWith(
        expect.objectContaining({
          ruleStatusesFilter: [],
        })
      );

      fireEvent.click((await screen.findAllByTestId('ruleStatusFilterButton'))[0]);
      fireEvent.click((await screen.findAllByTestId('ruleStatusFilterOption-enabled'))[0]);

      expect(loadRulesWithKueryFilter).toHaveBeenLastCalledWith(
        expect.objectContaining({
          ruleStatusesFilter: ['enabled'],
        })
      );

      fireEvent.click((await screen.findAllByTestId('ruleStatusFilterOption-snoozed'))[0]);

      expect(loadRulesWithKueryFilter).toHaveBeenLastCalledWith(
        expect.objectContaining({
          ruleStatusesFilter: ['enabled', 'snoozed'],
        })
      );

      fireEvent.click((await screen.findAllByTestId('ruleStatusFilterOption-snoozed'))[0]);

      expect(loadRulesWithKueryFilter).toHaveBeenLastCalledWith(
        expect.objectContaining({
          ruleStatusesFilter: ['enabled'],
        })
      );
    });

    it('does not render the tag filter is the feature flag is off', async () => {
      renderWithProviders(<RulesList />);
      await waitForElementToBeRemoved(() => screen.queryByTestId('centerJustifiedSpinner'));

      expect(screen.queryByTestId('ruleTagFilter')).not.toBeInTheDocument();
    });

    it('renders the tag filter if the experiment is on', async () => {
      (getIsExperimentalFeatureEnabled as jest.Mock<any, any>).mockImplementation(() => true);
      renderWithProviders(<RulesList />);
      await waitForElementToBeRemoved(() => screen.queryByTestId('centerJustifiedSpinner'));

      expect(screen.queryByTestId('ruleTagFilter')).toBeInTheDocument();
    });

    it('rule list items with actions are editable if canExecuteAction is true', async () => {
      renderWithProviders(<RulesList />);
      await waitForElementToBeRemoved(() => screen.queryByTestId('centerJustifiedSpinner'));

      const selectActionButtons = document.body.querySelectorAll('.euiButtonIcon[disabled]');
      expect(selectActionButtons).toHaveLength(2);
    });

    it('rule list items with actions are not editable if canExecuteAction is false', async () => {
      const { hasExecuteActionsCapability } = jest.requireMock('../../../lib/capabilities');
      hasExecuteActionsCapability.mockReturnValue(false);
      renderWithProviders(<RulesList />);
      await waitForElementToBeRemoved(() => screen.queryByTestId('centerJustifiedSpinner'));

      expect(document.body.querySelectorAll('button.euiButtonIcon[disabled]')).toHaveLength(8);
      hasExecuteActionsCapability.mockReturnValue(true);
    });

    // This might be repeated later
    describe('rules_list component empty with show only capability', () => {
      beforeEach(() => {
        (getIsExperimentalFeatureEnabled as jest.Mock<any, any>).mockImplementation(() => false);
        loadActionTypes.mockResolvedValue([
          {
            id: 'test',
            name: 'Test',
          },
          {
            id: 'test2',
            name: 'Test2',
          },
        ]);
        loadRuleTypes.mockResolvedValue([
          { id: 'test_rule_type', name: 'some rule type', authorizedConsumers: {} },
        ]);
        loadAllActions.mockResolvedValue([]);

        useKibanaMock().services.ruleTypeRegistry = ruleTypeRegistry;
        useKibanaMock().services.actionTypeRegistry = actionTypeRegistry;
      });

      it('not renders create rule button', async () => {
        renderWithProviders(<RulesList />);
        await waitForElementToBeRemoved(() => screen.queryByTestId('centerJustifiedSpinner'));
        expect(screen.queryByTestId('createRuleButton')).not.toBeInTheDocument();
      });
    });
  });
});

describe('rule list with different rule types', () => {
  let allRulesData;
  let filteredRuleTypes: string[];
  let ruleTypeRegistry: jest.Mocked<RuleTypeRegistryContract>;
  let actionTypeRegistry: jest.Mocked<ActionTypeRegistryContract<unknown, unknown>>;
  beforeEach(() => {
    filteredRuleTypes = ['test_rule_type2'];
    allRulesData = [
      {
        id: '1',
        name: 'test rule',
        tags: ['tag1'],
        enabled: true,
        ruleTypeId: 'test_rule_type',
        schedule: { interval: '1s' },
        actions: [],
        params: { name: 'test rule type name' },
        scheduledTaskId: null,
        createdBy: null,
        updatedBy: null,
        apiKeyOwner: null,
        throttle: '1m',
        muteAll: false,
        mutedInstanceIds: [],
        executionStatus: {
          status: 'active',
          lastDuration: 500,
          lastExecutionDate: new Date('2020-08-20T19:23:38Z'),
          error: null,
        },
        monitoring: {
          execution: {
            history: [
              {
                success: true,
                duration: 1000000,
              },
              {
                success: true,
                duration: 200000,
              },
              {
                success: false,
                duration: 300000,
              },
            ],
            calculated_metrics: {
              success_ratio: 0.66,
              p50: 200000,
              p95: 300000,
              p99: 300000,
            },
          },
        },
      },
      {
        id: '2',
        name: 'test rule ok',
        tags: ['tag1'],
        enabled: true,
        ruleTypeId: 'test_rule_type2',
        schedule: { interval: '5d' },
        actions: [],
        params: { name: 'test rule type name' },
        scheduledTaskId: null,
        createdBy: null,
        updatedBy: null,
        apiKeyOwner: null,
        throttle: '1m',
        muteAll: false,
        mutedInstanceIds: [],
        executionStatus: {
          status: 'ok',
          lastDuration: 61000,
          lastExecutionDate: new Date('2020-08-20T19:23:38Z'),
          error: null,
        },
        monitoring: {
          execution: {
            history: [
              {
                success: true,
                duration: 100000,
              },
              {
                success: true,
                duration: 500000,
              },
            ],
            calculated_metrics: {
              success_ratio: 1,
              p50: 0,
              p95: 100000,
              p99: 500000,
            },
          },
        },
      },
      {
        id: '3',
        name: 'test rule pending',
        tags: ['tag1'],
        enabled: true,
        ruleTypeId: 'test_rule_type2',
        schedule: { interval: '5d' },
        actions: [],
        params: { name: 'test rule type name' },
        scheduledTaskId: null,
        createdBy: null,
        updatedBy: null,
        apiKeyOwner: null,
        throttle: '1m',
        muteAll: false,
        mutedInstanceIds: [],
        executionStatus: {
          status: 'pending',
          lastDuration: 30234,
          lastExecutionDate: new Date('2020-08-20T19:23:38Z'),
          error: null,
        },
        monitoring: {
          execution: {
            history: [{ success: false, duration: 100 }],
            calculated_metrics: {
              success_ratio: 0,
            },
          },
        },
      },
    ];

    loadRulesWithKueryFilter.mockResolvedValue({
      page: 1,
      perPage: 10000,
      total: 2,
      data: allRulesData.filter(({ ruleTypeId }) => filteredRuleTypes.includes(ruleTypeId)),
    });
    loadActionTypes.mockResolvedValue([
      {
        id: 'test',
        name: 'Test',
      },
      {
        id: 'test2',
        name: 'Test2',
      },
    ]);
    loadRuleTypes.mockResolvedValue([
      ruleTypeFromApi,
      { ...ruleTypeFromApi, id: 'test_rule_type2' },
    ]);
    loadAllActions.mockResolvedValue([]);
    loadRuleAggregationsWithKueryFilter.mockResolvedValue({
      ruleEnabledStatus: { enabled: 2, disabled: 0 },
      ruleExecutionStatus: { ok: 1, active: 2, error: 3, pending: 4, unknown: 5, warning: 6 },
      ruleMutedStatus: { muted: 0, unmuted: 2 },
      ruleTags,
    });
    loadRuleTags.mockResolvedValue({
      data: ruleTags,
      page: 1,
      perPage: 50,
      total: 4,
    });
    const ruleTypeMock: RuleTypeModel = {
      id: 'test_rule_type',
      iconClass: 'test',
      description: 'Rule when testing',
      documentationUrl: 'https://localhost.local/docs',
      validate: () => {
        return { errors: {} };
      },
      ruleParamsExpression: jest.fn(),
      requiresAppContext: true,
    };
    actionTypeRegistry = actionTypeRegistryMock.create();
    ruleTypeRegistry = ruleTypeRegistryMock.create();
    ruleTypeRegistry.has.mockReturnValue(true);
    ruleTypeRegistry.get.mockReturnValue(ruleTypeMock);
    useKibanaMock().services.ruleTypeRegistry = ruleTypeRegistry;
    useKibanaMock().services.actionTypeRegistry = actionTypeRegistry;
  });

  afterEach(() => {
    jest.clearAllMocks();
    queryClient.clear();
    cleanup();
  });

  describe('filteredRuleTypes prop', () => {
    it('renders only rules for the specified rule types', async () => {
      renderWithProviders(<RulesList filteredRuleTypes={filteredRuleTypes} />);
      await waitForElementToBeRemoved(() => screen.queryByTestId('centerJustifiedSpinner'));

      expect(await screen.findAllByTestId('rule-row')).toHaveLength(2);
    });
  });
});

describe('rules_list with show only capability', () => {
  beforeEach(() => {
    loadActionTypes.mockResolvedValue([
      {
        id: 'test',
        name: 'Test',
      },
      {
        id: 'test2',
        name: 'Test2',
      },
    ]);
    loadAllActions.mockResolvedValue([]);
    loadRuleAggregationsWithKueryFilter.mockResolvedValue({
      ruleEnabledStatus: { enabled: 2, disabled: 0 },
      ruleExecutionStatus: { ok: 1, active: 2, error: 3, pending: 4, unknown: 5, warning: 6 },
      ruleMutedStatus: { muted: 0, unmuted: 2 },
      ruleTags,
    });
    loadRuleTags.mockResolvedValue({
      data: ruleTags,
      page: 1,
      perPage: 50,
      total: 4,
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
    queryClient.clear();
    cleanup();
  });

  describe('rules_list with enabled items', () => {
    beforeEach(() => {
      loadRulesWithKueryFilter.mockResolvedValue({
        page: 1,
        perPage: 10000,
        total: 2,
        data: [
          {
            id: '1',
            name: 'test rule',
            tags: ['tag1'],
            enabled: true,
            ruleTypeId: 'test_rule_type',
            schedule: { interval: '5d' },
            actions: [],
            params: { name: 'test rule type name' },
            scheduledTaskId: null,
            createdBy: null,
            updatedBy: null,
            apiKeyOwner: null,
            throttle: '1m',
            muteAll: false,
            mutedInstanceIds: [],
            executionStatus: {
              status: 'active',
              lastExecutionDate: new Date('2020-08-20T19:23:38Z'),
              error: null,
            },
          },
          {
            id: '2',
            name: 'test rule 2',
            tags: ['tag1'],
            enabled: true,
            ruleTypeId: 'test_rule_type',
            schedule: { interval: '5d' },
            actions: [{ id: 'test', group: 'rule', params: { message: 'test' } }],
            params: { name: 'test rule type name' },
            scheduledTaskId: null,
            createdBy: null,
            updatedBy: null,
            apiKeyOwner: null,
            throttle: '1m',
            muteAll: false,
            mutedInstanceIds: [],
            executionStatus: {
              status: 'active',
              lastExecutionDate: new Date('2020-08-20T19:23:38Z'),
              error: null,
            },
          },
        ],
      });
      loadRuleTypes.mockResolvedValue([ruleTypeFromApi]);
      const ruleTypeMock: RuleTypeModel = {
        id: 'test_rule_type',
        iconClass: 'test',
        description: 'Rule when testing',
        documentationUrl: 'https://localhost.local/docs',
        validate: () => {
          return { errors: {} };
        },
        ruleParamsExpression: jest.fn(),
        requiresAppContext: true,
      };
      const actionTypeRegistry = actionTypeRegistryMock.create();
      const ruleTypeRegistry = ruleTypeRegistryMock.create();
      ruleTypeRegistry.has.mockReturnValue(true);
      ruleTypeRegistry.get.mockReturnValue(ruleTypeMock);
      useKibanaMock().services.ruleTypeRegistry = ruleTypeRegistry;
      useKibanaMock().services.actionTypeRegistry = actionTypeRegistry;
    });

    it('renders table of rules with edit button disabled', async () => {
      renderWithProviders(<RulesList />);

      expect(await screen.findAllByTestId('rulesList')).toHaveLength(1);
      expect(await screen.findAllByTestId('rule-row')).toHaveLength(2);
      expect(screen.queryByTestId('editActionHoverButton')).not.toBeInTheDocument();
    });

    it('renders table of rules with delete button disabled', async () => {
      const { hasAllPrivilege } = jest.requireMock('../../../lib/capabilities');
      hasAllPrivilege.mockReturnValue(false);
      renderWithProviders(<RulesList />);
      expect(await screen.findAllByTestId('rulesList')).toHaveLength(1);
      expect(await screen.findAllByTestId('rule-row')).toHaveLength(2);
      expect(screen.queryByTestId('deleteActionHoverButton')).not.toBeInTheDocument();

      hasAllPrivilege.mockReturnValue(true);
    });

    it('renders table of rules with actions menu collapsedItemActions', async () => {
      renderWithProviders(<RulesList />);
      expect(await screen.findAllByTestId('rulesList')).toHaveLength(1);
      expect(await screen.findAllByTestId('rule-row')).toHaveLength(2);
      expect(await screen.findAllByTestId('collapsedItemActions')).toHaveLength(2);
    });
  });

  describe('rules_list with disabled items', () => {
    beforeEach(() => {
      loadRulesWithKueryFilter.mockResolvedValue({
        page: 1,
        perPage: 10000,
        total: 2,
        data: [
          {
            id: '1',
            name: 'test rule',
            tags: ['tag1'],
            enabled: true,
            ruleTypeId: 'test_rule_type',
            schedule: { interval: '5d' },
            actions: [],
            params: { name: 'test rule type name' },
            scheduledTaskId: null,
            createdBy: null,
            updatedBy: null,
            apiKeyOwner: null,
            throttle: '1m',
            muteAll: false,
            mutedInstanceIds: [],
            executionStatus: {
              status: 'active',
              lastExecutionDate: new Date('2020-08-20T19:23:38Z'),
              error: null,
            },
          },
          {
            id: '2',
            name: 'test rule 2',
            tags: ['tag1'],
            enabled: true,
            ruleTypeId: 'test_rule_type_disabled_by_license',
            schedule: { interval: '5d' },
            actions: [{ id: 'test', group: 'rule', params: { message: 'test' } }],
            params: { name: 'test rule type name' },
            scheduledTaskId: null,
            createdBy: null,
            updatedBy: null,
            apiKeyOwner: null,
            throttle: '1m',
            muteAll: false,
            mutedInstanceIds: [],
            executionStatus: {
              status: 'active',
              lastExecutionDate: new Date('2020-08-20T19:23:38Z'),
              error: null,
            },
          },
        ],
      });
      loadRuleTypes.mockResolvedValue([ruleTypeFromApi, getDisabledByLicenseRuleTypeFromApi()]);
      const ruleTypeRegistry = ruleTypeRegistryMock.create();
      ruleTypeRegistry.has.mockReturnValue(false);

      useKibanaMock().services.ruleTypeRegistry = ruleTypeRegistry;
    });

    it('renders rules list with disabled indicator if disabled due to license', async () => {
      renderWithProviders(<RulesList />);
      await waitForElementToBeRemoved(() => screen.queryByTestId('centerJustifiedSpinner'));

      const rows = await screen.findAllByTestId('rule-row');
      expect(rows[0].className).not.toContain('actRulesList__tableRowDisabled');
      expect(rows[1].className).toContain('actRulesList__tableRowDisabled');
      fireEvent.mouseOver(await screen.findByText('Info'));
      const tooltip = await screen.findByTestId('ruleDisabledByLicenseTooltip');
      expect(tooltip).toHaveTextContent('This rule type requires a Platinum license.');
    });

    it('clicking the notify badge shows the snooze panel', async () => {
      renderWithProviders(<RulesList />);
      await waitForElementToBeRemoved(() => screen.queryByTestId('centerJustifiedSpinner'));
      expect(screen.queryByTestId('snoozePanel]')).not.toBeInTheDocument();
      fireEvent.mouseOver((await screen.findAllByTestId('rulesTableCell-rulesListNotify'))[0]);
      expect((await screen.findAllByTestId('rulesListNotifyBadge'))[0]).toBeVisible();
      fireEvent.click((await screen.findAllByTestId('rulesListNotifyBadge-unsnoozed'))[0]);
      expect(await screen.findByTestId('snoozePanel')).toBeInTheDocument();
    });
  });
});
