/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import * as React from 'react';
import { ReactWrapper } from 'enzyme';
import { act } from '@testing-library/react';
import { mountWithIntl, nextTick } from '@kbn/test-jest-helpers';
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
  bulkEnableRules: jest.fn().mockResolvedValue({ errors: [], total: 10 }),
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

const { loadRuleTypes, bulkEnableRules } = jest.requireMock('../../../lib/rule_api');

const { loadRulesWithKueryFilter } = jest.requireMock('../../../lib/rule_api/rules_kuery_filter');
const { loadActionTypes, loadAllActions } = jest.requireMock('../../../lib/action_connector_api');

const actionTypeRegistry = actionTypeRegistryMock.create();
const ruleTypeRegistry = ruleTypeRegistryMock.create();

ruleTypeRegistry.list.mockReturnValue([ruleType]);
actionTypeRegistry.list.mockReturnValue([]);

const useKibanaMock = useKibana as jest.Mocked<typeof useKibana>;

beforeEach(() => {
  (getIsExperimentalFeatureEnabled as jest.Mock<any, any>).mockImplementation(() => false);
});

// Test are too slow. It's breaking the build. So we skipp it now and waiting for improvment according this ticket:
// https://github.com/elastic/kibana/issues/145122
describe.skip('Rules list bulk enable', () => {
  let wrapper: ReactWrapper<any>;

  const setup = async (authorized: boolean = true) => {
    loadRulesWithKueryFilter.mockResolvedValue({
      page: 1,
      perPage: 10000,
      total: 6,
      data: mockedRulesData.map((rule) => ({ ...rule, enabled: false })),
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
      getDisabledByLicenseRuleTypeFromApi(authorized),
    ]);
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
  };

  afterEach(() => {
    jest.clearAllMocks();
  });

  beforeAll(async () => {
    await setup();
    useKibanaMock().services.notifications.toasts = {
      addSuccess: jest.fn(),
      addError: jest.fn(),
      addDanger: jest.fn(),
      addWarning: jest.fn(),
    } as unknown as IToasts;
  });

  beforeEach(() => {
    wrapper.find('[data-test-subj="checkboxSelectRow-1"]').at(1).simulate('change');
    wrapper.find('[data-test-subj="selectAllRulesButton"]').at(1).simulate('click');
    // Unselect something to test filtering
    wrapper.find('[data-test-subj="checkboxSelectRow-2"]').at(1).simulate('change');
    wrapper.find('[data-test-subj="showBulkActionButton"]').first().simulate('click');
  });

  it('can bulk enable', async () => {
    wrapper.find('button[data-test-subj="bulkEnable"]').first().simulate('click');

    await act(async () => {
      await nextTick();
      wrapper.update();
    });

    const filter = bulkEnableRules.mock.calls[0][0].filter;

    expect(filter.function).toEqual('and');
    expect(filter.arguments[0].function).toEqual('or');
    expect(filter.arguments[1].function).toEqual('not');
    expect(filter.arguments[1].arguments[0].arguments[0].value).toEqual('alert.id');
    expect(filter.arguments[1].arguments[0].arguments[1].value).toEqual('alert:2');

    expect(bulkEnableRules).toHaveBeenCalledWith(
      expect.not.objectContaining({
        ids: [],
      })
    );
    expect(
      wrapper.find('[data-test-subj="checkboxSelectRow-1"]').first().prop('checked')
    ).toBeFalsy();
    expect(wrapper.find('button[data-test-subj="bulkEnable"]').exists()).toBeFalsy();
  });

  describe('Toast', () => {
    it('should have success toast message', async () => {
      wrapper.find('button[data-test-subj="bulkEnable"]').first().simulate('click');

      await act(async () => {
        await nextTick();
        wrapper.update();
      });

      expect(useKibanaMock().services.notifications.toasts.addSuccess).toHaveBeenCalledTimes(1);
      expect(useKibanaMock().services.notifications.toasts.addSuccess).toHaveBeenCalledWith(
        'Enabled 10 rules'
      );
    });

    it('should have warning toast message', async () => {
      bulkEnableRules.mockResolvedValue({
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

      wrapper.find('button[data-test-subj="bulkEnable"]').first().simulate('click');

      await act(async () => {
        await nextTick();
        wrapper.update();
      });

      expect(useKibanaMock().services.notifications.toasts.addWarning).toHaveBeenCalledTimes(1);
      expect(useKibanaMock().services.notifications.toasts.addWarning).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Enabled 9 rules, 1 rule encountered errors',
        })
      );
    });

    it('should have danger toast message', async () => {
      bulkEnableRules.mockResolvedValue({
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

      wrapper.find('button[data-test-subj="bulkEnable"]').first().simulate('click');

      await act(async () => {
        await nextTick();
        wrapper.update();
      });

      expect(useKibanaMock().services.notifications.toasts.addDanger).toHaveBeenCalledTimes(1);
      expect(useKibanaMock().services.notifications.toasts.addDanger).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Failed to enable 1 rule',
        })
      );
    });
  });
});
