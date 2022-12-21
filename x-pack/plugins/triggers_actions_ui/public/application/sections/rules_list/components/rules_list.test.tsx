/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as React from 'react';
import {
  fireEvent,
  act,
  render,
  screen,
  waitFor,
  waitForElementToBeRemoved,
} from '@testing-library/react';
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
import { asyncForEach } from '@kbn/std';
import { useKibana } from '../../../../common/lib/kibana';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { IToasts } from '@kbn/core/public';

import {
  mockedRulesData,
  ruleTypeFromApi,
  ruleType,
  getDisabledByLicenseRuleTypeFromApi,
} from './test_helpers';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { parseDuration } from '@kbn/alerting-plugin/common';
import { getFormattedDuration, getFormattedMilliseconds } from '../../../lib/monitoring_utils';
import { RuleTypeRegistry } from '@kbn/alerting-plugin/server/types';

jest.mock('../../../../common/lib/kibana');
jest.mock('@kbn/kibana-react-plugin/public/ui_settings/use_ui_setting', () => ({
  useUiSetting: jest.fn(() => false),
  useUiSetting$: jest.fn((value: string) => ['0,0']),
}));
jest.mock('../../../lib/action_connector_api', () => ({
  loadActionTypes: jest.fn(),
  loadAllActions: jest.fn(),
}));
jest.mock('../../../lib/rule_api', () => ({
  loadRulesWithKueryFilter: jest.fn(),
  loadRuleTypes: jest.fn(),
  loadRuleAggregationsWithKueryFilter: jest.fn(),
  updateAPIKey: jest.fn(),
  loadRuleTags: jest.fn(),
  bulkSnoozeRules: jest.fn(),
  bulkDeleteRules: jest.fn().mockResolvedValue({ errors: [], total: 10 }),
  bulkUnsnoozeRules: jest.fn(),
  bulkUpdateAPIKey: jest.fn(),
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

const { loadRuleTypes, updateAPIKey, loadRuleTags } = jest.requireMock('../../../lib/rule_api');
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
    },
  },
});

afterEach(() => {
  jest.clearAllMocks();
  queryClient.clear();
});

// FLAKY: https://github.com/elastic/kibana/issues/134922
// FLAKY: https://github.com/elastic/kibana/issues/134923
// FLAKY: https://github.com/elastic/kibana/issues/134924

describe.skip('Update Api Key', () => {
  const addSuccess = jest.fn();
  const addError = jest.fn();

  beforeAll(() => {
    loadRulesWithKueryFilter.mockResolvedValue({
      page: 1,
      perPage: 10000,
      total: 0,
      data: mockedRulesData,
    });
    loadActionTypes.mockResolvedValue([]);
    loadRuleTypes.mockResolvedValue([ruleTypeFromApi]);
    loadAllActions.mockResolvedValue([]);
    useKibanaMock().services.notifications.toasts = {
      addSuccess,
      addError,
    } as unknown as IToasts;
  });

  it('Updates the Api Key successfully', async () => {
    updateAPIKey.mockResolvedValueOnce(204);
    render(
      <IntlProvider locale="en">
        <RulesList />
      </IntlProvider>
    );
    expect(await screen.findByText('test rule ok')).toBeInTheDocument();

    fireEvent.click(screen.getAllByTestId('selectActionButton')[1]);
    expect(screen.getByTestId('collapsedActionPanel')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Update API key'));
    expect(screen.getByText('You will not be able to recover the old API key')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Cancel'));
    expect(
      screen.queryByText('You will not be able to recover the old API key')
    ).not.toBeInTheDocument();

    fireEvent.click(screen.getAllByTestId('selectActionButton')[1]);
    expect(screen.getByTestId('collapsedActionPanel')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Update API key'));

    await act(async () => {
      fireEvent.click(screen.getByText('Update'));
    });
    expect(updateAPIKey).toHaveBeenCalledWith(expect.objectContaining({ id: '2' }));
    expect(loadRulesWithKueryFilter).toHaveBeenCalledTimes(3);
    expect(screen.queryByText("You can't recover the old API key")).not.toBeInTheDocument();
    expect(addSuccess).toHaveBeenCalledWith('API key has been updated');
  });

  it('Update API key fails', async () => {
    updateAPIKey.mockRejectedValueOnce(500);
    render(
      <IntlProvider locale="en">
        <RulesList />
      </IntlProvider>
    );

    expect(await screen.findByText('test rule ok')).toBeInTheDocument();

    fireEvent.click(screen.getAllByTestId('selectActionButton')[1]);
    expect(screen.getByTestId('collapsedActionPanel')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Update API key'));
    expect(screen.getByText('You will not be able to recover the old API key')).toBeInTheDocument();

    await act(async () => {
      fireEvent.click(screen.getByText('Update'));
    });
    expect(updateAPIKey).toHaveBeenCalledWith(expect.objectContaining({ id: '2' }));
    expect(loadRulesWithKueryFilter).toHaveBeenCalledTimes(3);
    expect(
      screen.queryByText('You will not be able to recover the old API key')
    ).not.toBeInTheDocument();
    expect(addError).toHaveBeenCalledWith(500, { title: 'Failed to update the API key' });
  });
});

const AllTheProviders = ({ children }: { children: any }) => (
  <IntlProvider locale="en">
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  </IntlProvider>
);

const renderWithProviders = (ui: any) => {
  const el = document.createElement('div');
  document.body.appendChild(el);
  return render(ui, { wrapper: AllTheProviders, container: el });
};

describe('rules_list component empty', () => {
  beforeEach(() => {
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
    loadRuleTags.mockResolvedValue({});

    const actionTypeRegistry = actionTypeRegistryMock.create();
    const ruleTypeRegistry = ruleTypeRegistryMock.create();

    ruleTypeRegistry.list.mockReturnValue([ruleType]);
    actionTypeRegistry.list.mockReturnValue([]);

    useKibanaMock().services.ruleTypeRegistry = ruleTypeRegistry;
    useKibanaMock().services.actionTypeRegistry = actionTypeRegistry;
  });

  it('renders empty list', async () => {
    const { findByTestId } = renderWithProviders(<RulesList />);
    expect(await findByTestId('createFirstRuleEmptyPrompt')).toBeInTheDocument();
  });

  it('renders Create rule button', async () => {
    const { findByText, findByTestId, queryByTestId } = renderWithProviders(<RulesList />);

    const createRuleEl = await findByText('Create rule');
    expect(createRuleEl).toBeInTheDocument();
    expect(queryByTestId('addRuleFlyoutTitle')).not.toBeInTheDocument();

    fireEvent.click(createRuleEl);

    expect(await findByTestId('addRuleFlyoutTitle')).toBeInTheDocument();
  });
});

describe('rules_list ', () => {
  describe('first set of data', () => {
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
        ruleTags,
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

    describe('Status filter', () => {
      it('can filter by rule states', async () => {
        (getIsExperimentalFeatureEnabled as jest.Mock<any, any>).mockImplementation(() => true);
        const onStatusFilterChangeMock = jest.fn();
        const { getByText, getAllByTestId } = renderWithProviders(
          <RulesList statusFilter={['disabled']} onStatusFilterChange={onStatusFilterChangeMock} />
        );
        await waitFor(() => getByText('Rule state'));
        expect(loadRulesWithKueryFilter).toHaveBeenLastCalledWith(
          expect.objectContaining({
            ruleStatusesFilter: ['disabled'],
          })
        );
        fireEvent.click(getAllByTestId('ruleStatusFilterButton')[0]);
        fireEvent.click(getAllByTestId('ruleStatusFilterOption-enabled')[0]);
        expect(loadRulesWithKueryFilter).toHaveBeenLastCalledWith(
          expect.objectContaining({
            ruleStatusesFilter: ['disabled', 'enabled'],
          })
        );
        expect(onStatusFilterChangeMock).toHaveBeenCalled();
        expect(onStatusFilterChangeMock).toHaveBeenLastCalledWith(['disabled', 'enabled']);
      });
    });

    describe('Last response filter', () => {
      it('can filter by last response', async () => {
        const onLastRunOutcomeFilterChangeMock = jest.fn();
        const { getByTestId, getAllByTestId } = renderWithProviders(
          <RulesList
            lastRunOutcomeFilter={['failed']}
            onLastRunOutcomeFilterChange={onLastRunOutcomeFilterChangeMock}
          />
        );
        await waitFor(() => getByTestId('ruleLastRunOutcomeFilterButton'));
        fireEvent.click(getAllByTestId('ruleLastRunOutcomeFilterButton')[0]);
        fireEvent.click(getAllByTestId('ruleLastRunOutcomesucceededFilterOption')[0]);
        expect(onLastRunOutcomeFilterChangeMock).toHaveBeenLastCalledWith(['failed', 'succeeded']);
        expect(loadRulesWithKueryFilter).toHaveBeenLastCalledWith(
          expect.objectContaining({
            ruleLastRunOutcomesFilter: ['failed', 'succeeded'],
          })
        );
        await waitFor(() => getByTestId('ruleLastRunOutcomeFilterButton'));
        fireEvent.click(getAllByTestId('ruleLastRunOutcomeFilterButton')[0]);
        fireEvent.click(getAllByTestId('ruleLastRunOutcomefailedFilterOption')[0]);
        expect(loadRulesWithKueryFilter).toHaveBeenLastCalledWith(
          expect.objectContaining({
            ruleLastRunOutcomesFilter: ['succeeded'],
          })
        );
        expect(onLastRunOutcomeFilterChangeMock).toHaveBeenLastCalledWith(['succeeded']);
      });
    });

    describe('showActionFilter prop', () => {
      it('hides the ActionFilter component', async () => {
        const { queryAllByText } = renderWithProviders(<RulesList showActionFilter={false} />);
        expect(queryAllByText('Action type')).toHaveLength(0);
      });
      it('shows the ActionFilter component if no prop is passed', async () => {
        const { queryAllByText } = renderWithProviders(<RulesList />);
        expect(queryAllByText('Action type')).toHaveLength(1);
      });
      it('filters when the action type filter is changed', async () => {
        const { getAllByTestId, getAllByRole } = renderWithProviders(<RulesList />);
        await waitFor(() => getAllByTestId('actionTypeFilterButton')[0]);
        fireEvent.click(getAllByTestId('actionTypeFilterButton')[0]);
        fireEvent.click(getAllByTestId('actionTypetestFilterOption')[0]);
        // couldn't find better way, avoid using container! this is an exception
        expect(getAllByRole('marquee', { name: '1 active filters' }).length).toEqual(1);
      });
    });

    // review this test, we should be able to remove the act part
    describe('showCreateRuleButton prop', () => {
      beforeEach(() => {
        // (getIsExperimentalFeatureEnabled as jest.Mock<any, any>).mockImplementation(() => true);
      });

      it('hides the Create Rule button', async () => {
        const { queryAllByTestId } = renderWithProviders(
          <RulesList showCreateRuleButton={false} />
        );
        expect(queryAllByTestId('createRuleButton').length).toEqual(0);
      });

      it('shows the Create Rule button by default', async () => {
        const { queryAllByTestId } = renderWithProviders(<RulesList />);
        await waitFor(() => queryAllByTestId('createRuleButton'));
        expect(queryAllByTestId('createRuleButton').length).toEqual(1);
      });
    });

    describe.only('rules_list component with items', () => {
      it('should render basic table and its row', async () => {
        const { queryAllByTestId } = renderWithProviders(<RulesList />);
        await waitFor(() => expect(queryAllByTestId('rule-row').length).toEqual(6));
      });

      it('Name and rule type column', async () => {
        const { queryAllByTestId } = renderWithProviders(<RulesList />);

        let ruleNameColumns: HTMLElement[] = [];
        await waitFor(() => {
          ruleNameColumns = queryAllByTestId('rulesTableCell-name');
          return expect(ruleNameColumns.length).toEqual(mockedRulesData.length);
        });

        mockedRulesData.forEach((rule, index) => {
          expect(ruleNameColumns[index].textContent).toEqual(
            `Name${rule.name}${ruleTypeFromApi.name}`
          );
        });
      });

      it('Tags column', async () => {
        const { queryAllByTestId } = renderWithProviders(<RulesList />);

        await waitFor(() =>
          expect(queryAllByTestId('rulesTableCell-tagsPopover').length).toEqual(
            mockedRulesData.length
          )
        );
        // only show tags popover if tags exist on rule
        const tagsBadges = queryAllByTestId('ruleTagBadge');
        expect(tagsBadges.length).toEqual(
          mockedRulesData.filter((data) => data.tags.length > 0).length
        );
      });

      it('Last run column', async () => {
        const { queryAllByTestId } = renderWithProviders(<RulesList />);

        await waitFor(() =>
          expect(queryAllByTestId('rulesTableCell-lastExecutionDate').length).toEqual(
            mockedRulesData.length
          )
        );
      });

      it.only('Last run tooltip', async () => {
        const view = renderWithProviders(<RulesList />);
        await waitForElementToBeRemoved(() => view.queryByTestId('centerJustifiedSpinner'));

        await waitFor(() => view.getByText('Last run'));
        fireEvent.mouseOver(view.getByText('Last run'));

        expect(await view.findByText('Start time of the last run.')).toBeInTheDocument();
      });

      it('Schedule interval column', async () => {
        const { queryAllByTestId } = renderWithProviders(<RulesList />);

        await waitFor(() =>
          expect(queryAllByTestId('rulesTableCell-interval').length).toEqual(mockedRulesData.length)
        );
      });

      it('Schedule minimum interval tooltip', async () => {
        const { findByText, findByLabelText } = renderWithProviders(<RulesList />);

        fireEvent.mouseOver(await findByLabelText('Below configured minimum interval'));

        expect(
          await findByText(
            'Rule interval of 1 second is below the minimum configured interval of 1 minute. This may impact alerting performance.'
          )
        ).toBeInTheDocument();
      });

      it('long duration tooltip', async () => {
        const { getAllByText, queryAllByTestId } = renderWithProviders(<RulesList />);

        // Duration column
        await waitFor(() =>
          expect(queryAllByTestId('rulesTableCell-duration').length).toEqual(mockedRulesData.length)
        );

        // show warning if duration is long
        await waitFor(() => getAllByText('Info'));
        const durationWarningIcon = getAllByText('Info');
        expect(durationWarningIcon.length).toEqual(
          mockedRulesData.filter(
            (data) =>
              data.executionStatus.lastDuration > parseDuration(ruleTypeFromApi.ruleTaskTimeout)
          ).length
        );
      });

      it('duration tooltip', async () => {
        const { getAllByText, getByRole } = renderWithProviders(<RulesList />);

        await waitFor(() => getAllByText('Duration')[0]);
        fireEvent.mouseOver(getAllByText('Duration')[0]);

        await waitFor(() =>
          expect(getByRole('tooltip').textContent).toEqual(
            'The length of time it took for the rule to run (mm:ss).'
          )
        );
      });

      it('Last response column', async () => {
        const { getAllByTestId, findAllByTestId } = renderWithProviders(<RulesList />);

        expect((await findAllByTestId('rulesTableCell-lastResponse')).length).toEqual(
          mockedRulesData.length
        );
        expect(getAllByTestId('ruleStatus-succeeded').length).toEqual(2);
        expect(getAllByTestId('ruleStatus-failed').length).toEqual(2);
        expect(getAllByTestId('ruleStatus-warning').length).toEqual(1);
        fireEvent.mouseOver(getAllByTestId('ruleStatus-failed')[0]);

        expect((await findAllByTestId('ruleStatus-error-tooltip'))[0].textContent).toEqual(
          'Error: test'
        );
        expect(getAllByTestId('rulesListAutoRefresh').length).toBeGreaterThan(0);
        expect(getAllByTestId('ruleStatus-error-license-fix').length).toEqual(1);
        expect(getAllByTestId('ruleStatus-failed')[0].textContent).toEqual('Failed');
        const failedElements = getAllByTestId('ruleStatus-failed');
        expect(failedElements[failedElements.length - 1].textContent).toEqual('License Error'); // last element
      });

      it('Status control column', async () => {
        const { getAllByTestId } = renderWithProviders(<RulesList />);

        await waitFor(() => getAllByTestId('rulesTableCell-status')[0]);
        expect(getAllByTestId('rulesTableCell-status').length).toEqual(mockedRulesData.length);
      });

      it('Monitoring column', async () => {
        const { getAllByTestId } = renderWithProviders(<RulesList />);
        await waitFor(() => getAllByTestId('rulesTableCell-successRatio')[0]);
        expect(getAllByTestId('rulesTableCell-successRatio').length).toEqual(
          mockedRulesData.length
        );

        const ratios = getAllByTestId('successRatio');

        mockedRulesData.forEach((rule, index) => {
          if (rule.monitoring) {
            expect(ratios[index].textContent).toEqual(
              `${rule.monitoring.run.calculated_metrics.success_ratio * 100}%`
            );
          } else {
            expect(ratios[index].textContent).toEqual(`N/A`);
          }
        });
      });

      it('P50 column is rendered initially', async () => {
        const { getByTestId, findByTestId, container } = renderWithProviders(<RulesList />);
        await waitFor(() =>
          expect(getByTestId(`rulesTable-${Percentiles.P50}ColumnName`)).toBeDefined()
        );

        let percentiles: HTMLElement[] = [];
        await waitFor(() => {
          percentiles = Array.from(
            container.querySelectorAll(
              '[data-test-subj="rulesTableCell-ruleExecutionPercentile"] span[data-test-subj="rule-duration-format-value"]'
            )
          );
          return expect(percentiles.length).toBeGreaterThan(0);
        });

        fireEvent.mouseOver(percentiles[0]);
        expect(percentiles[0].textContent).toEqual('03:20');
        expect((await findByTestId('rule-duration-format-tooltip')).textContent).toBe('200,000 ms');
        fireEvent.mouseLeave(percentiles[0]);

        fireEvent.mouseOver(percentiles[1]);
        expect(percentiles[1].textContent).toEqual('00:00');
        expect((await findByTestId('rule-duration-format-tooltip')).textContent).toBe('0 ms');
        fireEvent.mouseLeave(percentiles[1]);

        fireEvent.mouseOver(percentiles[5]);
        expect(percentiles[1].textContent).toEqual('00:00');
        expect((await findByTestId('rule-duration-format-tooltip')).textContent).toBe('N/A');
      });

      it('Click column to sort by P50', async () => {
        const { getByTestId, queryAllByTestId, findByTestId, getAllByRole } = renderWithProviders(
          <RulesList />
        );
        const percentileEl: HTMLElement = await findByTestId(
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
        fireEvent.click(queryAllByTestId('percentileSelectablePopover-iconButton')[0]);

        // Percentile Selection
        await waitFor(() => expect(getByTestId('percentileSelectablePopover-selectable')));

        const percentileOptions = getAllByRole('option');
        expect(percentileOptions.length).toEqual(3);
      });

      it('Select P95', async () => {
        const { queryAllByTestId, findAllByTestId, findByTitle, container, getAllByRole } =
          renderWithProviders(<RulesList />);
        const percentilePopoverButton = await findByTitle('select percentile');
        fireEvent.click(percentilePopoverButton);

        await findAllByTestId('percentileSelectablePopover-selectable');
        const options = getAllByRole('option');
        fireEvent.click(options[1]);

        expect(queryAllByTestId(`rulesTable-${Percentiles.P95}ColumnName`).length).toBeGreaterThan(
          0
        );

        const percentiles: HTMLElement[] = Array.from(
          container.querySelectorAll(
            '[data-test-subj="rulesTableCell-ruleExecutionPercentile"] [data-test-subj="rule-duration-format-value"]'
          )
        );

        mockedRulesData.forEach((rule, index) => {
          if (typeof rule.monitoring?.run.calculated_metrics.p95 === 'number') {
            expect(percentiles[index].textContent).toEqual(
              getFormattedDuration(rule.monitoring.run.calculated_metrics.p95)
            );
          } else {
            expect(percentiles[index].textContent).toEqual('N/A');
          }
        });
      });

      it('Click column to sort by P95', async () => {
        const { findByTestId, findByTitle, getByTestId, findAllByTestId, getAllByRole } =
          renderWithProviders(<RulesList />);
        const percentilePopoverButton = await findByTitle('select percentile');
        fireEvent.click(percentilePopoverButton);
        await findAllByTestId('percentileSelectablePopover-selectable');
        const options = getAllByRole('option');
        fireEvent.click(options[1]);

        const p95Column = await findByTestId(`rulesTable-${Percentiles.P95}ColumnName`);
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
        fireEvent.click(getByTestId(`rulesTable-${Percentiles.P95}ColumnName`));

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
        const { getByTestId, queryAllByTestId } = renderWithProviders(<RulesList />);
        await waitFor(() => getByTestId('ruleStatus-error-license-fix'));
        fireEvent.click(getByTestId('ruleStatus-error-license-fix'));

        expect(queryAllByTestId('manageLicenseModal').length).toBeGreaterThan(0);
        expect(getByTestId('confirmModalConfirmButton').textContent).toEqual('Manage license');
        fireEvent.click(getByTestId('confirmModalConfirmButton'));
        expect(global.open).toHaveBeenCalled();
      });

      it('sorts rules when clicking the name column', async () => {
        const { findByTestId } = renderWithProviders(<RulesList />);

        const nameColumnTableHeaderEl = await findByTestId('tableHeaderCell_name_1');
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
        const { findByTestId } = renderWithProviders(<RulesList />);

        const enabledColumnTableHeaderEl = await findByTestId('tableHeaderCell_enabled_10');
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
        const { findAllByTestId, queryByTestId } = renderWithProviders(<RulesList />);
        await waitForElementToBeRemoved(() => queryByTestId('centerJustifiedSpinner'));
        expect((await findAllByTestId('ruleSidebarEditAction')).length).toBeGreaterThan(0);
        expect((await findAllByTestId('ruleSidebarDeleteAction')).length).toBeGreaterThan(0);
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
        const { findAllByTestId, queryByTestId } = renderWithProviders(<RulesList />);
        await waitForElementToBeRemoved(() => queryByTestId('centerJustifiedSpinner'));
        expect(queryByTestId('ruleSidebarEditAction')).not.toBeInTheDocument();
        expect((await findAllByTestId('ruleSidebarDeleteAction')).length).toBeGreaterThan(0);
      });

      it('renders brief', async () => {
        const { findByTestId } = renderWithProviders(<RulesList />);

        // ruleLastRunOutcome: {
        //   succeeded: 3,
        //   failed: 3,
        //   warning: 6,
        // }
        expect((await findByTestId('totalSucceededRulesCount')).textContent).toEqual(
          'Succeeded: 3'
        );
        expect((await findByTestId('totalFailedRulesCount')).textContent).toEqual('Failed: 3');
        expect((await findByTestId('totalWarningRulesCount')).textContent).toEqual('Warning: 6');
      });

      it('does not render the status filter if the feature flag is off', async () => {
        const { queryByTestId } = renderWithProviders(<RulesList />);
        expect(queryByTestId('ruleStatusFilter')).not.toBeInTheDocument();
      });

      it('renders the status filter if the experiment is on', async () => {
        (getIsExperimentalFeatureEnabled as jest.Mock<any, any>).mockImplementation(() => true);

        const { queryByTestId } = renderWithProviders(<RulesList />);
        expect(queryByTestId('ruleStatusFilter')).toBeInTheDocument();
      });

      it('can filter by rule states', async () => {
        (getIsExperimentalFeatureEnabled as jest.Mock<any, any>).mockImplementation(() => true);
        const { findAllByTestId, queryByTestId } = renderWithProviders(<RulesList />);
        await waitForElementToBeRemoved(() => queryByTestId('centerJustifiedSpinner'));

        expect(loadRulesWithKueryFilter).toHaveBeenLastCalledWith(
          expect.objectContaining({
            ruleStatusesFilter: [],
          })
        );

        fireEvent.click((await findAllByTestId('ruleStatusFilterButton'))[0]);
        fireEvent.click((await findAllByTestId('ruleStatusFilterOption-enabled'))[0]);

        expect(loadRulesWithKueryFilter).toHaveBeenLastCalledWith(
          expect.objectContaining({
            ruleStatusesFilter: ['enabled'],
          })
        );

        fireEvent.click((await findAllByTestId('ruleStatusFilterOption-snoozed'))[0]);

        expect(loadRulesWithKueryFilter).toHaveBeenLastCalledWith(
          expect.objectContaining({
            ruleStatusesFilter: ['enabled', 'snoozed'],
          })
        );

        fireEvent.click((await findAllByTestId('ruleStatusFilterOption-snoozed'))[0]);

        expect(loadRulesWithKueryFilter).toHaveBeenLastCalledWith(
          expect.objectContaining({
            ruleStatusesFilter: ['enabled'],
          })
        );
      });

      it('does not render the tag filter is the feature flag is off', async () => {
        const { queryByTestId } = renderWithProviders(<RulesList />);
        await waitForElementToBeRemoved(() => queryByTestId('centerJustifiedSpinner'));

        expect(queryByTestId('ruleTagFilter')).not.toBeInTheDocument();
      });

      it('renders the tag filter if the experiment is on', async () => {
        (getIsExperimentalFeatureEnabled as jest.Mock<any, any>).mockImplementation(() => true);
        const { queryByTestId } = renderWithProviders(<RulesList />);
        await waitForElementToBeRemoved(() => queryByTestId('centerJustifiedSpinner'));

        expect(queryByTestId('ruleTagFilter')).toBeInTheDocument();
      });

      it('can filter by tags', async () => {
        (getIsExperimentalFeatureEnabled as jest.Mock<any, any>).mockImplementation(() => true);
        const { queryByTestId, findByTestId, getByTestId } = renderWithProviders(<RulesList />);
        await waitForElementToBeRemoved(() => queryByTestId('centerJustifiedSpinner'));

        expect(loadRulesWithKueryFilter).toHaveBeenLastCalledWith(
          expect.objectContaining({
            tagsFilter: [],
          })
        );

        const ruleTagFilterButtonEl = getByTestId('ruleTagFilterButton');
        fireEvent.click(ruleTagFilterButtonEl);

        fireEvent.click(await findByTestId('ruleTagFilterOption-a'));

        expect(loadRulesWithKueryFilter).toHaveBeenLastCalledWith(
          expect.objectContaining({
            tagsFilter: ['a'],
          })
        );

        fireEvent.click(await findByTestId('ruleTagFilterOption-b'));

        expect(loadRulesWithKueryFilter).toHaveBeenLastCalledWith(
          expect.objectContaining({
            tagsFilter: ['a', 'b'],
          })
        );
      });

      it('rule list items with actions are editable if canExecuteAction is true', async () => {
        const { container, queryByTestId } = renderWithProviders(<RulesList />);
        await waitForElementToBeRemoved(() => queryByTestId('centerJustifiedSpinner'));

        const selectActionButtons = container.querySelectorAll('.euiButtonIcon[disabled]');
        expect(selectActionButtons.length).toEqual(2);
      });

      it('rule list items with actions are not editable if canExecuteAction is false', async () => {
        const { hasExecuteActionsCapability } = jest.requireMock('../../../lib/capabilities');
        hasExecuteActionsCapability.mockReturnValue(false);
        const { container } = renderWithProviders(<RulesList />);

        expect(container.querySelectorAll('button.euiButtonIcon[disabled]').length).toEqual(8);
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
          const { queryAllByTestId } = renderWithProviders(<RulesList />);
          expect(queryAllByTestId('createRuleButton').length).toEqual(0);
        });
      });
    });
  });

  describe('second set of data', () => {
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
        ruleTags,
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
      ruleTypeRegistry.has.mockReturnValue(true);
      ruleTypeRegistry.get.mockReturnValue(ruleTypeMock);
      useKibanaMock().services.ruleTypeRegistry = ruleTypeRegistry;
      useKibanaMock().services.actionTypeRegistry = actionTypeRegistry;
    });

    describe('filteredRuleTypes prop', () => {
      it('renders only rules for the specified rule types', async () => {
        const { queryAllByTestId } = renderWithProviders(
          <RulesList filteredRuleTypes={filteredRuleTypes} />
        );
        await waitFor(() => expect(queryAllByTestId('rule-row').length).toEqual(2));
      });
    });
  });
});

// describe('rules_list with show only capability', () => {
//   beforeEach(() => {
//     loadRulesWithKueryFilter.mockResolvedValue({
//       page: 1,
//       perPage: 10000,
//       total: 2,
//       data: [
//         {
//           id: '1',
//           name: 'test rule',
//           tags: ['tag1'],
//           enabled: true,
//           ruleTypeId: 'test_rule_type',
//           schedule: { interval: '5d' },
//           actions: [],
//           params: { name: 'test rule type name' },
//           scheduledTaskId: null,
//           createdBy: null,
//           updatedBy: null,
//           apiKeyOwner: null,
//           throttle: '1m',
//           muteAll: false,
//           mutedInstanceIds: [],
//           executionStatus: {
//             status: 'active',
//             lastExecutionDate: new Date('2020-08-20T19:23:38Z'),
//             error: null,
//           },
//         },
//         {
//           id: '2',
//           name: 'test rule 2',
//           tags: ['tag1'],
//           enabled: true,
//           ruleTypeId: 'test_rule_type',
//           schedule: { interval: '5d' },
//           actions: [{ id: 'test', group: 'rule', params: { message: 'test' } }],
//           params: { name: 'test rule type name' },
//           scheduledTaskId: null,
//           createdBy: null,
//           updatedBy: null,
//           apiKeyOwner: null,
//           throttle: '1m',
//           muteAll: false,
//           mutedInstanceIds: [],
//           executionStatus: {
//             status: 'active',
//             lastExecutionDate: new Date('2020-08-20T19:23:38Z'),
//             error: null,
//           },
//         },
//       ],
//     });
//     loadActionTypes.mockResolvedValue([
//       {
//         id: 'test',
//         name: 'Test',
//       },
//       {
//         id: 'test2',
//         name: 'Test2',
//       },
//     ]);
//     loadAllActions.mockResolvedValue([]);
//   });
//   describe('rules_list with enabled items', () => {
//     beforeEach(() => {
//       loadRuleTypes.mockResolvedValue([ruleTypeFromApi]);
//       const ruleTypeMock: RuleTypeModel = {
//         id: 'test_rule_type',
//         iconClass: 'test',
//         description: 'Rule when testing',
//         documentationUrl: 'https://localhost.local/docs',
//         validate: () => {
//           return { errors: {} };
//         },
//         ruleParamsExpression: jest.fn(),
//         requiresAppContext: true,
//       };
//       ruleTypeRegistry.has.mockReturnValue(true);
//       ruleTypeRegistry.get.mockReturnValue(ruleTypeMock);
//       useKibanaMock().services.ruleTypeRegistry = ruleTypeRegistry;
//       useKibanaMock().services.actionTypeRegistry = actionTypeRegistry;
//     });
//     it('renders table of rules with edit button disabled', async () => {
//       const { queryAllByTestId } = renderWithProviders(<RulesList />);
//       expect(wrapper.find('EuiBasicTable')).toHaveLength(1);
//       expect(wrapper.find('EuiTableRow')).toHaveLength(2);
//       expect(wrapper.find('[data-test-subj="editActionHoverButton"]')).toHaveLength(0);
//     });
//     it('renders table of rules with delete button disabled', async () => {
//       const { hasAllPrivilege } = jest.requireMock('../../../lib/capabilities');
//       hasAllPrivilege.mockReturnValue(false);
//       const { queryAllByTestId } = renderWithProviders(<RulesList />);
//       expect(wrapper.find('EuiBasicTable')).toHaveLength(1);
//       expect(wrapper.find('EuiTableRow')).toHaveLength(2);
//       expect(wrapper.find('[data-test-subj="deleteActionHoverButton"]')).toHaveLength(0);
//       hasAllPrivilege.mockReturnValue(true);
//     });
//     it('renders table of rules with actions menu collapsedItemActions', async () => {
//       const { queryAllByTestId } = renderWithProviders(<RulesList />);
//       expect(wrapper.find('EuiBasicTable')).toHaveLength(1);
//       expect(wrapper.find('EuiTableRow')).toHaveLength(2);
//       expect(wrapper.find('[data-test-subj="collapsedItemActions"]').length).toBeGreaterThan(0);
//     });
//   });
//   describe('rules_list with disabled items', () => {
//     beforeEach(() => {
//       loadRuleTypes.mockResolvedValue([ruleTypeFromApi, getDisabledByLicenseRuleTypeFromApi()]);
//       ruleTypeRegistry.has.mockReturnValue(false);
//     });
//     it('renders rules list with disabled indicator if disabled due to license', async () => {
//       await setup();
//       expect(wrapper.find('EuiBasicTable')).toHaveLength(1);
//       expect(wrapper.find('EuiTableRow')).toHaveLength(2);
//       expect(wrapper.find('EuiTableRow').at(0).prop('className')).toEqual('');
//       expect(wrapper.find('EuiTableRow').at(1).prop('className')?.trim()).toEqual(
//         'actRulesList__tableRowDisabled'
//       );
//       expect(wrapper.find('EuiIconTip[data-test-subj="ruleDisabledByLicenseTooltip"]').length).toBe(
//         1
//       );
//       expect(
//         wrapper.find('EuiIconTip[data-test-subj="ruleDisabledByLicenseTooltip"]').props().type
//       ).toEqual('questionInCircle');
//       expect(
//         wrapper.find('EuiIconTip[data-test-subj="ruleDisabledByLicenseTooltip"]').props().content
//       ).toEqual('This rule type requires a Platinum license.');
//     });
//     it('clicking the notify badge shows the snooze panel', async () => {
//       await setup();
//       expect(wrapper.find('[data-test-subj="snoozePanel"]').exists()).toBeFalsy();
//       wrapper
//         .find('[data-test-subj="rulesTableCell-rulesListNotify"]')
//         .first()
//         .simulate('mouseenter');
//       expect(wrapper.find('[data-test-subj="rulesListNotifyBadge"]').exists()).toBeTruthy();
//       wrapper.find('[data-test-subj="rulesListNotifyBadge-unsnoozed"]').first().simulate('click');
//       expect(wrapper.find('[data-test-subj="snoozePanel"]').exists()).toBeTruthy();
//     });
//   });
// });
