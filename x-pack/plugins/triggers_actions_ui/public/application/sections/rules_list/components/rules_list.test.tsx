/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as React from 'react';
import { fireEvent, act, render, screen, waitFor } from '@testing-library/react';
import { mountWithIntl, nextTick } from '@kbn/test-jest-helpers';
import { actionTypeRegistryMock } from '../../../action_type_registry.mock';
import { ruleTypeRegistryMock } from '../../../rule_type_registry.mock';
import { RulesList } from './rules_list';
import { RuleTypeModel } from '../../../../types';
import { getIsExperimentalFeatureEnabled } from '../../../../common/get_experimental_features';

import { useKibana } from '../../../../common/lib/kibana';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { IToasts } from '@kbn/core/public';

import { mockedRulesData, ruleTypeFromApi, ruleType } from './test_helpers';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

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

const actionTypeRegistry = actionTypeRegistryMock.create();
const ruleTypeRegistry = ruleTypeRegistryMock.create();

ruleTypeRegistry.list.mockReturnValue([ruleType]);
actionTypeRegistry.list.mockReturnValue([]);

const useKibanaMock = useKibana as jest.Mocked<typeof useKibana>;
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
  },
});

beforeEach(() => {});

// This entire test suite is flaky/timing out and has been skipped.
afterEach(() => {
  jest.clearAllMocks();
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

  afterEach(() => {
    jest.clearAllMocks();
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

describe.skip('rules_list component empty', () => {
  let wrapper: ReactWrapper<any>;
  async function setup() {
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

    // eslint-disable-next-line react-hooks/rules-of-hooks
    useKibanaMock().services.ruleTypeRegistry = ruleTypeRegistry;

    // eslint-disable-next-line react-hooks/rules-of-hooks
    useKibanaMock().services.actionTypeRegistry = actionTypeRegistry;

    wrapper = mountWithIntl(<RulesList />);

    await act(async () => {
      await nextTick();
      wrapper.update();
    });
  }

  it('renders empty list', async () => {
    await setup();
    expect(wrapper.find('[data-test-subj="createFirstRuleEmptyPrompt"]').exists()).toBeTruthy();
  });

  it('renders Create rule button', async () => {
    await setup();
    expect(wrapper.find('[data-test-subj="createFirstRuleButton"]').find('EuiButton')).toHaveLength(
      1
    );
    expect(wrapper.find('RuleAdd').exists()).toBeFalsy();

    wrapper.find('button[data-test-subj="createFirstRuleButton"]').simulate('click');

    await act(async () => {
      // When the RuleAdd component is rendered, it waits for the healthcheck to resolve
      await new Promise((resolve) => {
        setTimeout(resolve, 1000);
      });

      await nextTick();
      wrapper.update();
    });

    expect(wrapper.find('RuleAdd').exists()).toEqual(true);
  });
});

const AllTheProviders = ({ children }: { children: any }) => (
  <IntlProvider locale="en">
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  </IntlProvider>
);

const renderWithProviders = (ui: any) => {
  return render(ui, { wrapper: AllTheProviders });
};

describe('rules_list ', () => {
  describe('first set of data', () => {
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

        expect(loadRulesWithKueryFilter).toHaveBeenLastCalledWith(
          expect.objectContaining({
            ruleStatusesFilter: ['disabled'],
          })
        );

        await waitFor(() => getByText('Rule state'));

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

    describe('showCreateRuleButton prop', () => {
      beforeEach(() => {
        // (getIsExperimentalFeatureEnabled as jest.Mock<any, any>).mockImplementation(() => true);
      });

      it('hides the Create Rule button', async () => {
        const { queryAllByTestId } = renderWithProviders(
          <RulesList showCreateRuleButton={false} />
        );
        await act(async () => {
          await nextTick();
        });
        expect(queryAllByTestId('createRuleButton').length).toEqual(0);
      });

      it('shows the Create Rule button by default', async () => {
        const { queryAllByTestId } = renderWithProviders(<RulesList />);
        await waitFor(() => queryAllByTestId('createRuleButton'));
        expect(queryAllByTestId('createRuleButton').length).toEqual(1);
      });
    });

    describe('rules_list component with items', () => {
      describe('render table of rules', () => {
        beforeEach(async () => {
          // Use fake timers so we don't have to wait for the EuiToolTip timeout
          jest.useFakeTimers({ legacyFakeTimers: true });
        });

        afterEach(() => {
          jest.clearAllMocks();
        });

        it('should render basic table and its row', async () => {
          const { queryAllByTestId } = renderWithProviders(<RulesList />);
          await waitFor(() => expect(queryAllByTestId('rule-row').length).toEqual(6));
        });

        it('Name and rule type column', async () => {
          const { queryAllByTestId } = renderWithProviders(<RulesList />);
          await waitFor(() => queryAllByTestId('rulesTableCell-name'));
          const ruleNameColumns = queryAllByTestId('rulesTableCell-name');
          expect(ruleNameColumns.length).toEqual(mockedRulesData.length);
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

        it('Last run tooltip', async () => {
          const { getByText, getAllByText } = renderWithProviders(<RulesList />);

          await waitFor(() => getAllByText('Last run')[0]);
          fireEvent.mouseOver(getAllByText('Last run')[0]);

          // Run the timers so the EuiTooltip will be visible
          jest.runOnlyPendingTimers();

          await waitFor(() => getByText('Start time of the last run.'));
        });

        it('Schedule interval column', async () => {
          const { queryAllByTestId } = renderWithProviders(<RulesList />);

          await waitFor(() =>
            expect(queryAllByTestId('rulesTableCell-interval').length).toEqual(
              mockedRulesData.length
            )
          );
        });

        it('Schedule minimum interval tooltip', async () => {
          const { getByText, getByLabelText } = renderWithProviders(<RulesList />);

          await waitFor(() => getByLabelText('Below configured minimum interval'));
          fireEvent.mouseOver(getByLabelText('Below configured minimum interval'));

          // Run the timers so the EuiTooltip will be visible
          jest.runOnlyPendingTimers();

          await waitFor(() =>
            getByText(
              'Rule interval of 1 second is below the minimum configured interval of 1 minute. This may impact alerting performance.'
            )
          );
          fireEvent.mouseOut(getByLabelText('Below configured minimum interval'));
        });

        it('long duration tooltip', async () => {
          const { getAllByText, queryAllByTestId } = renderWithProviders(<RulesList />);

          // Duration column
          await waitFor(() =>
            expect(queryAllByTestId('rulesTableCell-duration').length).toEqual(
              mockedRulesData.length
            )
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

          fireEvent.mouseOver(getAllByText('Duration')[0]);

          // Run the timers so the EuiTooltip will be visible
          jest.runOnlyPendingTimers();
          await waitFor(() =>
            expect(getByRole('tooltip').textContent).toEqual(
              'The length of time it took for the rule to run (mm:ss).'
            )
          );
        });

        it.skip('Last response column', async () => {
          const { getAllByTestId } = renderWithProviders(<RulesList />);

          await waitFor(() => getAllByTestId('rulesTableCell-lastResponse')[0]);
          expect(getAllByTestId('rulesTableCell-lastResponse').length).toEqual(
            mockedRulesData.length
          );
          expect(getAllByTestId('ruleStatus-succeeded').length).toEqual(2);
          expect(getAllByTestId('ruleStatus-failed').length).toEqual(2);
          expect(getAllByTestId('ruleStatus-warning').length).toEqual(1);
          expect(getAllByTestId('ruleStatus-error-license-fix').length).toEqual(1);
          expect(getAllByTestId('ruleStatus-failed')[0].textContent).toEqual('Failed');
          const failedElements = getAllByTestId('ruleStatus-failed');
          expect(failedElements[failedElements.length - 1].textContent).toEqual('License Error'); // last element

          // TODO: review why these are failing
          expect(getAllByTestId('ruleStatus-error-tooltip').length).toEqual(2);
          expect(getAllByTestId('rulesListAutoRefresh').length).toBeGreater(0);
        });

        it('Status control column', async () => {
          const { getAllByTestId } = renderWithProviders(<RulesList />);

          await waitFor(() => getAllByTestId('rulesTableCell-status')[0]);
          expect(getAllByTestId('rulesTableCell-status').length).toEqual(mockedRulesData.length);
        });

        it.skip('Monitoring column', async () => {
          const { getAllByTestId } = renderWithProviders(<RulesList />);
          await waitFor(() => getAllByTestId('rulesTableCell-successRatio')[0]);
          expect(getAllByTestId('rulesTableCell-successRatio').length).toEqual(
            mockedRulesData.length
          );

          const ratios = getAllByTestId('successRatio');

          mockedRulesData.forEach((rule, index) => {
            if (rule.monitoring) {
              expect(ratios[0].textContent).toEqual(
                `${rule.monitoring.run.calculated_metrics.success_ratio * 100}%`
              );
            } else {
              expect(ratios[0].textContent).toEqual(`N/A`);
            }
          });
        });

        //     it('P50 column is rendered initially', () => {
        //       expect(
        //         wrapper.find(`[data-test-subj="rulesTable-${Percentiles.P50}ColumnName"]`).exists()
        //       ).toBeTruthy();

        //       const percentiles = wrapper.find(
        //         `EuiTableRowCell[data-test-subj="rulesTableCell-ruleExecutionPercentile"] span[data-test-subj="rule-duration-format-value"]`
        //       );

        //       mockedRulesData.forEach((rule, index) => {
        //         if (typeof rule.monitoring?.run.calculated_metrics.p50 === 'number') {
        //           // Ensure the table cells are getting the correct values
        //           expect(percentiles.at(index).text()).toEqual(
        //             getFormattedDuration(rule.monitoring.run.calculated_metrics.p50)
        //           );
        //           // Ensure the tooltip is showing the correct content
        //           expect(
        //             wrapper
        //               .find(
        //                 'EuiTableRowCell[data-test-subj="rulesTableCell-ruleExecutionPercentile"] [data-test-subj="rule-duration-format-tooltip"]'
        //               )
        //               .at(index)
        //               .props().content
        //           ).toEqual(getFormattedMilliseconds(rule.monitoring.run.calculated_metrics.p50));
        //         } else {
        //           expect(percentiles.at(index).text()).toEqual('N/A');
        //         }
        //       });
        //     });

        //     it('Click column to sort by P50', () => {
        //       wrapper
        //         .find(`[data-test-subj="rulesTable-${Percentiles.P50}ColumnName"]`)
        //         .first()
        //         .simulate('click');

        //       expect(loadRulesWithKueryFilter).toHaveBeenCalledWith(
        //         expect.objectContaining({
        //           sort: {
        //             field: percentileFields[Percentiles.P50],
        //             direction: 'asc',
        //           },
        //         })
        //       );

        //       // Click column again to reverse sort by P50
        //       wrapper
        //         .find(`[data-test-subj="rulesTable-${Percentiles.P50}ColumnName"]`)
        //         .first()
        //         .simulate('click');

        //       expect(loadRulesWithKueryFilter).toHaveBeenCalledWith(
        //         expect.objectContaining({
        //           sort: {
        //             field: percentileFields[Percentiles.P50],
        //             direction: 'desc',
        //           },
        //         })
        //       );

        //       // Hover over percentile selection button
        //       wrapper
        //         .find('[data-test-subj="percentileSelectablePopover-iconButton"]')
        //         .first()
        //         .simulate('click');

        //       jest.runOnlyPendingTimers();
        //       wrapper.update();

        //       // Percentile Selection
        //       expect(
        //         wrapper.find('[data-test-subj="percentileSelectablePopover-selectable"]').exists()
        //       ).toBeTruthy();

        //       const percentileOptions = wrapper.find(
        //         '[data-test-subj="percentileSelectablePopover-selectable"] li'
        //       );
        //       expect(percentileOptions.length).toEqual(3);
        //     });

        //     it('Select P95', () => {
        //       const percentileOptions = wrapper.find(
        //         '[data-test-subj="percentileSelectablePopover-selectable"] li'
        //       );

        //       percentileOptions.at(1).simulate('click');

        //       jest.runOnlyPendingTimers();
        //       wrapper.update();

        //       expect(
        //         wrapper.find(`[data-test-subj="rulesTable-${Percentiles.P95}ColumnName"]`).exists()
        //       ).toBeTruthy();

        //       const percentiles = wrapper.find(
        //         `EuiTableRowCell[data-test-subj="rulesTableCell-ruleExecutionPercentile"] span[data-test-subj="rule-duration-format-value"]`
        //       );

        //       mockedRulesData.forEach((rule, index) => {
        //         if (typeof rule.monitoring?.run.calculated_metrics.p95 === 'number') {
        //           expect(percentiles.at(index).text()).toEqual(
        //             getFormattedDuration(rule.monitoring.run.calculated_metrics.p95)
        //           );
        //         } else {
        //           expect(percentiles.at(index).text()).toEqual('N/A');
        //         }
        //       });
        //     });

        //     it('Click column to sort by P95', () => {
        //       wrapper
        //         .find(`[data-test-subj="rulesTable-${Percentiles.P95}ColumnName"]`)
        //         .first()
        //         .simulate('click');

        //       expect(loadRulesWithKueryFilter).toHaveBeenCalledWith(
        //         expect.objectContaining({
        //           sort: {
        //             field: percentileFields[Percentiles.P95],
        //             direction: 'asc',
        //           },
        //         })
        //       );

        //       // Click column again to reverse sort by P95
        //       wrapper
        //         .find(`[data-test-subj="rulesTable-${Percentiles.P95}ColumnName"]`)
        //         .first()
        //         .simulate('click');

        //       expect(loadRulesWithKueryFilter).toHaveBeenCalledWith(
        //         expect.objectContaining({
        //           sort: {
        //             field: percentileFields[Percentiles.P95],
        //             direction: 'desc',
        //           },
        //         })
        //       );
        //     });
        //   });

        //   it('renders license errors and manage license modal on click', async () => {
        //     global.open = jest.fn();
        //     await setup();
        //     expect(wrapper.find('ManageLicenseModal').exists()).toBeFalsy();
        //     expect(
        //       wrapper.find('EuiButtonEmpty[data-test-subj="ruleStatus-error-license-fix"]').length
        //     ).toEqual(1);
        //     wrapper.find('EuiButtonEmpty[data-test-subj="ruleStatus-error-license-fix"]').simulate('click');

        //     await act(async () => {
        //       await nextTick();
        //       wrapper.update();
        //     });

        //     expect(wrapper.find('ManageLicenseModal').exists()).toBeTruthy();
        //     expect(wrapper.find('EuiButton[data-test-subj="confirmModalConfirmButton"]').text()).toEqual(
        //       'Manage license'
        //     );
        //     wrapper.find('button[data-test-subj="confirmModalConfirmButton"]').simulate('click');
        //     expect(global.open).toHaveBeenCalled();
        //   });

        //   it('sorts rules when clicking the name column', async () => {
        //     await setup();
        //     wrapper
        //       .find('[data-test-subj="tableHeaderCell_name_1"] .euiTableHeaderButton')
        //       .first()
        //       .simulate('click');

        //     await act(async () => {
        //       await nextTick();
        //       wrapper.update();
        //     });

        //     expect(loadRulesWithKueryFilter).toHaveBeenCalledWith(
        //       expect.objectContaining({
        //         sort: {
        //           field: 'name',
        //           direction: 'desc',
        //         },
        //       })
        //     );
        //   });

        //   it('sorts rules when clicking the status control column', async () => {
        //     await setup();
        //     wrapper
        //       .find('[data-test-subj="tableHeaderCell_enabled_10"] .euiTableHeaderButton')
        //       .first()
        //       .simulate('click');

        //     await act(async () => {
        //       await nextTick();
        //       wrapper.update();
        //     });

        //     expect(loadRulesWithKueryFilter).toHaveBeenLastCalledWith(
        //       expect.objectContaining({
        //         sort: {
        //           field: 'enabled',
        //           direction: 'asc',
        //         },
        //       })
        //     );
        //   });

        //   it('renders edit and delete buttons when user can manage rules', async () => {
        //     await setup();
        //     expect(wrapper.find('[data-test-subj="ruleSidebarEditAction"]').exists()).toBeTruthy();
        //     expect(wrapper.find('[data-test-subj="ruleSidebarDeleteAction"]').exists()).toBeTruthy();
        //   });

        //   it('does not render edit and delete button when rule type does not allow editing in rules management', async () => {
        //     await setup(false);
        //     expect(wrapper.find('[data-test-subj="ruleSidebarEditAction"]').exists()).toBeFalsy();
        //     expect(wrapper.find('[data-test-subj="ruleSidebarDeleteAction"]').exists()).toBeTruthy();
        //   });

        //   it('renders brief', async () => {
        //     (getIsExperimentalFeatureEnabled as jest.Mock<any, any>).mockImplementation(() => false);
        //     await setup();

        //     // ruleLastRunOutcome: {
        //     //   succeeded: 3,
        //     //   failed: 3,
        //     //   warning: 6,
        //     // }
        //     expect(wrapper.find('EuiHealth[data-test-subj="totalSucceededRulesCount"]').text()).toEqual(
        //       'Succeeded: 3'
        //     );
        //     expect(wrapper.find('EuiHealth[data-test-subj="totalFailedRulesCount"]').text()).toEqual(
        //       'Failed: 3'
        //     );
        //     expect(wrapper.find('EuiHealth[data-test-subj="totalWarningRulesCount"]').text()).toEqual(
        //       'Warning: 6'
        //     );
        //   });

        //   it('does not render the status filter if the feature flag is off', async () => {
        //     await setup();
        //     expect(wrapper.find('[data-test-subj="ruleStatusFilter"]').exists()).toBeFalsy();
        //   });

        //   it('renders the status filter if the experiment is on', async () => {
        //     (getIsExperimentalFeatureEnabled as jest.Mock<any, any>).mockImplementation(() => true);
        //     await setup();
        //     expect(wrapper.find('[data-test-subj="ruleStatusFilter"]').exists()).toBeTruthy();
        //   });

        //   it('can filter by rule states', async () => {
        //     (getIsExperimentalFeatureEnabled as jest.Mock<any, any>).mockImplementation(() => true);
        //     loadRulesWithKueryFilter.mockReset();
        //     await setup();

        //     expect(loadRulesWithKueryFilter).toHaveBeenLastCalledWith(
        //       expect.objectContaining({
        //         ruleStatusesFilter: [],
        //       })
        //     );

        //     wrapper.find('[data-test-subj="ruleStatusFilterButton"] button').simulate('click');

        //     wrapper.find('[data-test-subj="ruleStatusFilterOption-enabled"]').first().simulate('click');

        //     expect(loadRulesWithKueryFilter).toHaveBeenLastCalledWith(
        //       expect.objectContaining({
        //         ruleStatusesFilter: ['enabled'],
        //       })
        //     );

        //     wrapper.find('[data-test-subj="ruleStatusFilterOption-snoozed"]').first().simulate('click');

        //     expect(loadRulesWithKueryFilter).toHaveBeenLastCalledWith(
        //       expect.objectContaining({
        //         ruleStatusesFilter: ['enabled', 'snoozed'],
        //       })
        //     );

        //     wrapper.find('[data-test-subj="ruleStatusFilterOption-snoozed"]').first().simulate('click');

        //     expect(loadRulesWithKueryFilter).toHaveBeenLastCalledWith(
        //       expect.objectContaining({
        //         ruleStatusesFilter: ['enabled'],
        //       })
        //     );
        //   });

        //   it('does not render the tag filter is the feature flag is off', async () => {
        //     await setup();
        //     expect(wrapper.find('[data-test-subj="ruleTagFilter"]').exists()).toBeFalsy();
        //   });

        //   it('renders the tag filter if the experiment is on', async () => {
        //     (getIsExperimentalFeatureEnabled as jest.Mock<any, any>).mockImplementation(() => true);
        //     await setup();
        //     expect(wrapper.find('[data-test-subj="ruleTagFilter"]').exists()).toBeTruthy();
        //   });

        //   it('can filter by tags', async () => {
        //     (getIsExperimentalFeatureEnabled as jest.Mock<any, any>).mockImplementation(() => true);
        //     loadRulesWithKueryFilter.mockReset();
        //     await setup();

        //     expect(loadRulesWithKueryFilter).toHaveBeenLastCalledWith(
        //       expect.objectContaining({
        //         tagsFilter: [],
        //       })
        //     );

        //     wrapper.find('[data-test-subj="ruleTagFilterButton"] button').simulate('click');

        //     const tagFilterListItems = wrapper.find(
        //       '[data-test-subj="ruleTagFilterSelectable"] .euiSelectableListItem'
        //     );
        //     expect(tagFilterListItems.length).toEqual(ruleTags.length);

        //     tagFilterListItems.at(0).simulate('click');

        //     expect(loadRulesWithKueryFilter).toHaveBeenLastCalledWith(
        //       expect.objectContaining({
        //         tagsFilter: ['a'],
        //       })
        //     );

        //     tagFilterListItems.at(1).simulate('click');

        //     expect(loadRulesWithKueryFilter).toHaveBeenLastCalledWith(
        //       expect.objectContaining({
        //         tagsFilter: ['a', 'b'],
        //       })
        //     );
        //   });

        //   it('rule list items with actions are editable if canExecuteAction is true', async () => {
        //     await setup();
        //     expect(wrapper.find('button.euiButtonIcon[disabled=true]').length).toEqual(2);
        //   });

        //   it('rule list items with actions are not editable if canExecuteAction is false', async () => {
        //     const { hasExecuteActionsCapability } = jest.requireMock('../../../lib/capabilities');
        //     hasExecuteActionsCapability.mockReturnValue(false);
        //     await setup();
        //     expect(wrapper.find('button.euiButtonIcon[disabled=true]').length).toEqual(8);
        //     hasExecuteActionsCapability.mockReturnValue(true);
        //   });
        // });

        // describe('rules_list component empty with show only capability', () => {
        //   let wrapper: ReactWrapper<any>;

        //   async function setup() {
        //     loadRulesWithKueryFilter.mockResolvedValue({
        //       page: 1,
        //       perPage: 10000,
        //       total: 0,
        //       data: [],
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
        //     loadRuleTypes.mockResolvedValue([
        //       { id: 'test_rule_type', name: 'some rule type', authorizedConsumers: {} },
        //     ]);
        //     loadAllActions.mockResolvedValue([]);
        //     // eslint-disable-next-line react-hooks/rules-of-hooks
        //     useKibanaMock().services.ruleTypeRegistry = ruleTypeRegistry;

        //     // eslint-disable-next-line react-hooks/rules-of-hooks
        //     useKibanaMock().services.actionTypeRegistry = actionTypeRegistry;
        //     wrapper = mountWithIntl(<RulesList />);

        //     await act(async () => {
        //       await nextTick();
        //       wrapper.update();
        //     });
        //   }

        //   it('not renders create rule button', async () => {
        //     await setup();
        //     expect(wrapper.find('[data-test-subj="createRuleButton"]')).toHaveLength(0);
        //   });
      });
    });

    describe('second set of data', () => {
      let allRulesData;
      let filteredRuleTypes: string[];
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
});
// describe('rules_list with show only capability', () => {
//   let wrapper: ReactWrapper<any>;

//   async function setup(editable: boolean = true) {
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

//     loadRuleTypes.mockResolvedValue([ruleTypeFromApi]);
//     loadAllActions.mockResolvedValue([]);

//     const ruleTypeMock: RuleTypeModel = {
//       id: 'test_rule_type',
//       iconClass: 'test',
//       description: 'Rule when testing',
//       documentationUrl: 'https://localhost.local/docs',
//       validate: () => {
//         return { errors: {} };
//       },
//       ruleParamsExpression: jest.fn(),
//       requiresAppContext: !editable,
//     };

//     ruleTypeRegistry.has.mockReturnValue(true);
//     ruleTypeRegistry.get.mockReturnValue(ruleTypeMock);
//     // eslint-disable-next-line react-hooks/rules-of-hooks
//     useKibanaMock().services.ruleTypeRegistry = ruleTypeRegistry;

//     // eslint-disable-next-line react-hooks/rules-of-hooks
//     useKibanaMock().services.actionTypeRegistry = actionTypeRegistry;
//     wrapper = mountWithIntl(<RulesList />);

//     await act(async () => {
//       await nextTick();
//       wrapper.update();
//     });
//   }

//   it('renders table of rules with edit button disabled', async () => {
//     await setup(false);
//     expect(wrapper.find('EuiBasicTable')).toHaveLength(1);
//     expect(wrapper.find('EuiTableRow')).toHaveLength(2);
//     expect(wrapper.find('[data-test-subj="editActionHoverButton"]')).toHaveLength(0);
//   });

//   it('renders table of rules with delete button disabled', async () => {
//     const { hasAllPrivilege } = jest.requireMock('../../../lib/capabilities');
//     hasAllPrivilege.mockReturnValue(false);
//     await setup(false);
//     expect(wrapper.find('EuiBasicTable')).toHaveLength(1);
//     expect(wrapper.find('EuiTableRow')).toHaveLength(2);
//     expect(wrapper.find('[data-test-subj="deleteActionHoverButton"]')).toHaveLength(0);
//     hasAllPrivilege.mockReturnValue(true);
//   });

//   it('renders table of rules with actions menu collapsedItemActions', async () => {
//     await setup(false);
//     expect(wrapper.find('EuiBasicTable')).toHaveLength(1);
//     expect(wrapper.find('EuiTableRow')).toHaveLength(2);
//     expect(wrapper.find('[data-test-subj="collapsedItemActions"]').length).toBeGreaterThan(0);
//   });
// });

// describe('rules_list with disabled items', () => {
//   let wrapper: ReactWrapper<any>;

//   async function setup() {
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
//           ruleTypeId: 'test_rule_type_disabled_by_license',
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

//     loadRuleTypes.mockResolvedValue([ruleTypeFromApi, getDisabledByLicenseRuleTypeFromApi()]);
//     loadAllActions.mockResolvedValue([]);

//     ruleTypeRegistry.has.mockReturnValue(false);
//     // eslint-disable-next-line react-hooks/rules-of-hooks
//     useKibanaMock().services.ruleTypeRegistry = ruleTypeRegistry;

//     // eslint-disable-next-line react-hooks/rules-of-hooks
//     useKibanaMock().services.actionTypeRegistry = actionTypeRegistry;
//     wrapper = mountWithIntl(<RulesList />);

//     await act(async () => {
//       await nextTick();
//       wrapper.update();
//     });
//   }

//   it('renders rules list with disabled indicator if disabled due to license', async () => {
//     await setup();
//     expect(wrapper.find('EuiBasicTable')).toHaveLength(1);
//     expect(wrapper.find('EuiTableRow')).toHaveLength(2);
//     expect(wrapper.find('EuiTableRow').at(0).prop('className')).toEqual('');
//     expect(wrapper.find('EuiTableRow').at(1).prop('className')?.trim()).toEqual(
//       'actRulesList__tableRowDisabled'
//     );
//     expect(wrapper.find('EuiIconTip[data-test-subj="ruleDisabledByLicenseTooltip"]').length).toBe(
//       1
//     );
//     expect(
//       wrapper.find('EuiIconTip[data-test-subj="ruleDisabledByLicenseTooltip"]').props().type
//     ).toEqual('questionInCircle');
//     expect(
//       wrapper.find('EuiIconTip[data-test-subj="ruleDisabledByLicenseTooltip"]').props().content
//     ).toEqual('This rule type requires a Platinum license.');
//   });

//   it('clicking the notify badge shows the snooze panel', async () => {
//     await setup();
//     expect(wrapper.find('[data-test-subj="snoozePanel"]').exists()).toBeFalsy();

//     wrapper
//       .find('[data-test-subj="rulesTableCell-rulesListNotify"]')
//       .first()
//       .simulate('mouseenter');

//     expect(wrapper.find('[data-test-subj="rulesListNotifyBadge"]').exists()).toBeTruthy();

//     wrapper.find('[data-test-subj="rulesListNotifyBadge-unsnoozed"]').first().simulate('click');

//     expect(wrapper.find('[data-test-subj="snoozePanel"]').exists()).toBeTruthy();
//   });
// });
