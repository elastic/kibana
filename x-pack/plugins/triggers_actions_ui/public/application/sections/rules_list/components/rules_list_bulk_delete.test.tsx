/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import * as React from 'react';
import { IToasts } from '@kbn/core/public';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import {
  render,
  screen,
  waitForElementToBeRemoved,
  fireEvent,
  act,
  cleanup,
} from '@testing-library/react';
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
jest.mock('../../../lib/rule_api/bulk_delete', () => ({
  bulkDeleteRules: jest.fn().mockResolvedValue({ errors: [], total: 10 }),
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
const { loadRuleAggregationsWithKueryFilter } = jest.requireMock(
  '../../../lib/rule_api/aggregate_kuery_filter'
);
const { loadRuleTypes } = jest.requireMock('../../../lib/rule_api/rule_types');
const { bulkDeleteRules } = jest.requireMock('../../../lib/rule_api/bulk_delete');

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

describe('Rules list Bulk Delete', () => {
  beforeEach(async () => {
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
    cleanup();
  });

  beforeEach(async () => {
    renderWithProviders(<RulesList />);
    await waitForElementToBeRemoved(() => screen.queryByTestId('centerJustifiedSpinner'));

    fireEvent.click(screen.getByTestId('checkboxSelectRow-1'));
    fireEvent.click(screen.getByTestId('selectAllRulesButton'));
    fireEvent.click(screen.getByTestId('checkboxSelectRow-2'));
    fireEvent.click(screen.getByTestId('showBulkActionButton'));
  });

  it('should Bulk Delete', async () => {
    fireEvent.click(screen.getByTestId('bulkDelete'));
    expect(screen.getByTestId('rulesDeleteConfirmation')).toBeInTheDocument();
    await act(async () => {
      fireEvent.click(screen.getByTestId('confirmModalConfirmButton'));
    });

    const filter = bulkDeleteRules.mock.calls[0][0].filter;

    expect(filter.function).toEqual('and');
    expect(filter.arguments[0].function).toEqual('or');
    expect(filter.arguments[1].function).toEqual('not');
    expect(filter.arguments[1].arguments[0].arguments[0].value).toEqual('alert.id');
    expect(filter.arguments[1].arguments[0].arguments[1].value).toEqual('alert:2');

    expect(bulkDeleteRules).toHaveBeenCalledWith(
      expect.not.objectContaining({
        ids: [],
      })
    );
  });

  it('should cancel Bulk Delete', async () => {
    fireEvent.click(screen.getByTestId('bulkDelete'));
    expect(screen.getByTestId('rulesDeleteConfirmation')).toBeInTheDocument();
    await act(async () => {
      fireEvent.click(screen.getByTestId('confirmModalCancelButton'));
    });
    expect(bulkDeleteRules).not.toBeCalled();
  });

  it('should have warning toast message after Bulk Delete', async () => {
    bulkDeleteRules.mockResolvedValue({
      errors: [
        {
          message: 'string',
          rule: {
            id: 'string',
            name: 'string',
          },
        },
      ],
      total: 10,
    });

    fireEvent.click(screen.getByTestId('bulkDelete'));
    expect(screen.getByTestId('rulesDeleteConfirmation')).toBeInTheDocument();
    await act(async () => {
      fireEvent.click(screen.getByTestId('confirmModalConfirmButton'));
    });

    expect(useKibanaMock().services.notifications.toasts.addWarning).toHaveBeenCalledTimes(1);
    expect(useKibanaMock().services.notifications.toasts.addWarning).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Deleted 9 rules, 1 rule encountered errors',
      })
    );
  });

  it('should have danger toast message after Bulk Delete', async () => {
    bulkDeleteRules.mockResolvedValue({
      errors: [
        {
          message: 'string',
          rule: {
            id: 'string',
            name: 'string',
          },
        },
      ],
      total: 1,
    });

    fireEvent.click(screen.getByTestId('bulkDelete'));
    expect(screen.getByTestId('rulesDeleteConfirmation')).toBeInTheDocument();
    await act(async () => {
      fireEvent.click(screen.getByTestId('confirmModalConfirmButton'));
    });

    expect(useKibanaMock().services.notifications.toasts.addDanger).toHaveBeenCalledTimes(1);
    expect(useKibanaMock().services.notifications.toasts.addDanger).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Failed to delete 1 rule',
      })
    );
  });
});
