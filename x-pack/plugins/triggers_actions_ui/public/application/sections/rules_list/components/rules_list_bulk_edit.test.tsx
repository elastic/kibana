/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import * as React from 'react';
import { actionTypeRegistryMock } from '../../../action_type_registry.mock';
import { ruleTypeRegistryMock } from '../../../rule_type_registry.mock';
import { RulesList } from './rules_list';
import { getIsExperimentalFeatureEnabled } from '../../../../common/get_experimental_features';
import { useKibana } from '../../../../common/lib/kibana';
import {
  mockedRulesData,
  ruleTypeFromApi,
  getDisabledByLicenseRuleTypeFromApi,
  ruleType,
} from './test_helpers';
import { IToasts } from '@kbn/core/public';
import { act, render, screen, waitForElementToBeRemoved, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';

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
jest.mock('../../../lib/capabilities', () => ({
  hasAllPrivilege: jest.fn(() => true),
  hasSaveRulesCapability: jest.fn(() => true),
  hasShowActionsCapability: jest.fn(() => true),
  hasExecuteActionsCapability: jest.fn(() => true),
}));
jest.mock('../../../../common/get_experimental_features', () => ({
  getIsExperimentalFeatureEnabled: jest.fn(),
}));
jest.mock('../../../lib/rule_api/aggregate_kuery_filter', () => ({
  loadRuleAggregationsWithKueryFilter: jest.fn(),
}));

const { loadRuleAggregationsWithKueryFilter } = jest.requireMock(
  '../../../lib/rule_api/aggregate_kuery_filter'
);
const { loadRuleTypes } = jest.requireMock('../../../lib/rule_api/rule_types');
const { bulkSnoozeRules } = jest.requireMock('../../../lib/rule_api/snooze');
const { bulkUnsnoozeRules } = jest.requireMock('../../../lib/rule_api/unsnooze');
const { bulkUpdateAPIKey } = jest.requireMock('../../../lib/rule_api/update_api_key');

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

describe('Rules list Bulk Edit', () => {
  beforeAll(async () => {
    (getIsExperimentalFeatureEnabled as jest.Mock<any, any>).mockImplementation(() => false);
    loadRulesWithKueryFilter.mockResolvedValue({
      page: 1,
      perPage: 10000,
      total: 6,
      data: mockedRulesData,
    });
    loadActionTypes.mockResolvedValue([]);
    loadRuleTypes.mockResolvedValue([ruleTypeFromApi, getDisabledByLicenseRuleTypeFromApi()]);
    loadAllActions.mockResolvedValue([]);
    loadRuleAggregationsWithKueryFilter.mockResolvedValue({});
    useKibanaMock().services.ruleTypeRegistry = ruleTypeRegistry;
    useKibanaMock().services.actionTypeRegistry = actionTypeRegistry;
    useKibanaMock().services.notifications.toasts = {
      addSuccess: jest.fn(),
      addError: jest.fn(),
      addDanger: jest.fn(),
      addWarning: jest.fn(),
    } as unknown as IToasts;
  });

  afterEach(() => {
    jest.clearAllMocks();
    queryClient.clear();
  });

  // FLAKY: https://github.com/elastic/kibana/issues/152268
  // FLAKY: https://github.com/elastic/kibana/issues/152267
  describe.skip('bulk actions', () => {
    beforeEach(async () => {
      renderWithProviders(<RulesList />);
      await waitForElementToBeRemoved(() => screen.queryByTestId('centerJustifiedSpinner'));

      fireEvent.click(screen.getByTestId('checkboxSelectRow-1'));
      fireEvent.click(screen.getByTestId('selectAllRulesButton'));
      fireEvent.click(screen.getByTestId('checkboxSelectRow-2'));
      fireEvent.click(screen.getByTestId('showBulkActionButton'));
    });

    it('can bulk add snooze schedule', async () => {
      fireEvent.click(screen.getByTestId('bulkSnoozeSchedule'));
      expect(screen.queryByTestId('ruleSnoozeScheduler')).toBeInTheDocument();
      await act(async () => {
        fireEvent.click(screen.getByTestId('scheduler-saveSchedule'));
      });

      const filter = bulkSnoozeRules.mock.calls[0][0].filter;

      expect(filter.function).toEqual('and');
      expect(filter.arguments[0].function).toEqual('or');
      expect(filter.arguments[1].function).toEqual('not');
      expect(filter.arguments[1].arguments[0].arguments[0].value).toEqual('alert.id');
      expect(filter.arguments[1].arguments[0].arguments[1].value).toEqual('alert:2');

      expect(bulkSnoozeRules).toHaveBeenCalledWith(
        expect.objectContaining({
          ids: [],
        })
      );
    });

    it('can bulk remove snooze schedule', async () => {
      fireEvent.click(screen.getByTestId('bulkRemoveSnoozeSchedule'));
      expect(screen.queryByTestId('bulkRemoveScheduleConfirmationModal')).toBeInTheDocument();
      await act(async () => {
        fireEvent.click(screen.getByTestId('confirmModalConfirmButton'));
      });

      const filter = bulkUnsnoozeRules.mock.calls[0][0].filter;

      expect(filter.function).toEqual('and');
      expect(filter.arguments[0].function).toEqual('or');
      expect(filter.arguments[1].function).toEqual('not');
      expect(filter.arguments[1].arguments[0].arguments[0].value).toEqual('alert.id');
      expect(filter.arguments[1].arguments[0].arguments[1].value).toEqual('alert:2');

      expect(bulkUnsnoozeRules).toHaveBeenCalledWith(
        expect.objectContaining({
          ids: [],
          scheduleIds: [],
        })
      );
    });

    it('can bulk snooze', async () => {
      fireEvent.click(screen.getByTestId('bulkSnooze'));
      expect(screen.queryByTestId('snoozePanel')).toBeInTheDocument();
      await act(async () => {
        fireEvent.click(screen.getByTestId('linkSnooze1h'));
      });

      const filter = bulkSnoozeRules.mock.calls[0][0].filter;

      expect(filter.function).toEqual('and');
      expect(filter.arguments[0].function).toEqual('or');
      expect(filter.arguments[1].function).toEqual('not');
      expect(filter.arguments[1].arguments[0].arguments[0].value).toEqual('alert.id');
      expect(filter.arguments[1].arguments[0].arguments[1].value).toEqual('alert:2');

      expect(bulkSnoozeRules).toHaveBeenCalledWith(
        expect.objectContaining({
          ids: [],
        })
      );
    });

    it('can bulk unsnooze', async () => {
      fireEvent.click(screen.getByTestId('bulkUnsnooze'));
      expect(screen.queryByTestId('bulkUnsnoozeConfirmationModal')).toBeInTheDocument();
      await act(async () => {
        fireEvent.click(screen.getByTestId('confirmModalConfirmButton'));
      });

      const filter = bulkUnsnoozeRules.mock.calls[0][0].filter;

      expect(filter.function).toEqual('and');
      expect(filter.arguments[0].function).toEqual('or');
      expect(filter.arguments[1].function).toEqual('not');
      expect(filter.arguments[1].arguments[0].arguments[0].value).toEqual('alert.id');
      expect(filter.arguments[1].arguments[0].arguments[1].value).toEqual('alert:2');

      expect(bulkUnsnoozeRules).toHaveBeenCalledWith(
        expect.objectContaining({
          ids: [],
        })
      );
    });

    it('can bulk update API key', async () => {
      fireEvent.click(screen.getByTestId('updateAPIKeys'));
      expect(screen.queryByTestId('updateApiKeyIdsConfirmation')).toBeInTheDocument();
      await act(async () => {
        fireEvent.click(screen.getByTestId('confirmModalConfirmButton'));
      });

      const filter = bulkUpdateAPIKey.mock.calls[0][0].filter;

      expect(filter.function).toEqual('and');
      expect(filter.arguments[0].function).toEqual('or');
      expect(filter.arguments[1].function).toEqual('not');
      expect(filter.arguments[1].arguments[0].arguments[0].value).toEqual('alert.id');
      expect(filter.arguments[1].arguments[0].arguments[1].value).toEqual('alert:2');

      expect(bulkUpdateAPIKey).toHaveBeenCalledWith(
        expect.objectContaining({
          ids: [],
        })
      );
    });
  });

  it('renders select all button for bulk editing', async () => {
    renderWithProviders(<RulesList />);
    await waitForElementToBeRemoved(() => screen.queryByTestId('centerJustifiedSpinner'));

    expect(screen.queryByTestId('totalRulesCount')).toBeInTheDocument();
    expect(screen.queryByTestId('showBulkActionButton')).not.toBeInTheDocument();
    expect(screen.queryByTestId('selectAllRulesButton')).not.toBeInTheDocument();

    fireEvent.click(screen.getByTestId('checkboxSelectRow-1'));

    expect(screen.queryByTestId('totalRulesCount')).not.toBeInTheDocument();
    expect(screen.queryByTestId('showBulkActionButton')).toBeInTheDocument();
    expect(screen.queryByTestId('selectAllRulesButton')).toBeInTheDocument();
  });

  it('selects all will select all items', async () => {
    renderWithProviders(<RulesList />);
    await waitForElementToBeRemoved(() => screen.queryByTestId('centerJustifiedSpinner'));

    fireEvent.click(screen.getByTestId('checkboxSelectRow-1'));
    fireEvent.click(screen.getByTestId('selectAllRulesButton'));

    mockedRulesData.forEach((rule) => {
      expect(screen.getByTestId(`checkboxSelectRow-${rule.id}`).closest('tr')).toHaveClass(
        'euiTableRow-isSelected'
      );
    });

    fireEvent.click(screen.getByTestId('showBulkActionButton'));

    expect(screen.queryByTestId('ruleQuickEditButton')).toBeInTheDocument();
    expect(screen.queryByTestId('bulkDisable')).toBeInTheDocument();
    expect(screen.queryByTestId('bulkEnable')).toBeInTheDocument();
    expect(screen.queryByTestId('bulkDelete')).toBeInTheDocument();
  });

  it('does not render select all button if the user is not authorized', async () => {
    loadRuleTypes.mockResolvedValue([ruleTypeFromApi, getDisabledByLicenseRuleTypeFromApi(false)]);
    renderWithProviders(<RulesList />);
    await waitForElementToBeRemoved(() => screen.queryByTestId('centerJustifiedSpinner'));

    fireEvent.click(screen.getByTestId('checkboxSelectRow-1'));

    expect(screen.queryByTestId('showBulkActionButton')).toBeInTheDocument();
    expect(screen.queryByTestId('selectAllRulesButton')).not.toBeInTheDocument();
  });
});
