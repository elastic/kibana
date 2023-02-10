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

const { loadRuleTypes, bulkSnoozeRules, bulkUnsnoozeRules, bulkUpdateAPIKey } =
  jest.requireMock('../../../lib/rule_api');

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

describe.skip('Rules list bulk actions', () => {
  let wrapper: ReactWrapper<any>;

  async function setup(authorized: boolean = true) {
    loadRulesWithKueryFilter.mockResolvedValue({
      page: 1,
      perPage: 10000,
      total: 6,
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
  }

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders select all button for bulk editing', async () => {
    await setup();
    expect(wrapper.find('[data-test-subj="totalRulesCount"]').exists()).toBeTruthy();
    expect(wrapper.find('[data-test-subj="showBulkActionButton"]').exists()).toBeFalsy();
    expect(wrapper.find('[data-test-subj="selectAllRulesButton"]').exists()).toBeFalsy();

    wrapper.find('[data-test-subj="checkboxSelectRow-1"]').at(1).simulate('change');

    expect(wrapper.find('[data-test-subj="totalRulesCount"]').exists()).toBeFalsy();
    expect(wrapper.find('[data-test-subj="showBulkActionButton"]').exists()).toBeTruthy();
    expect(wrapper.find('[data-test-subj="selectAllRulesButton"]').exists()).toBeTruthy();
  });

  it('does not render select all button if the user is not authorized', async () => {
    await setup(false);
    wrapper.find('[data-test-subj="checkboxSelectRow-1"]').at(1).simulate('change');
    expect(wrapper.find('[data-test-subj="showBulkActionButton"]').exists()).toBeTruthy();
    expect(wrapper.find('[data-test-subj="selectAllRulesButton"]').exists()).toBeFalsy();
  });

  it('selects all will select all items', async () => {
    await setup();
    wrapper.find('[data-test-subj="checkboxSelectRow-1"]').at(1).simulate('change');
    wrapper.find('[data-test-subj="selectAllRulesButton"]').at(1).simulate('click');

    mockedRulesData.forEach((rule) => {
      expect(
        wrapper.find(`[data-test-subj="checkboxSelectRow-${rule.id}"]`).first().prop('checked')
      ).toBeTruthy();
    });

    wrapper.find('[data-test-subj="showBulkActionButton"]').first().simulate('click');

    expect(wrapper.find('[data-test-subj="ruleQuickEditButton"]').exists()).toBeTruthy();
    expect(wrapper.find('[data-test-subj="disableAll"]').first().prop('isDisabled')).toBeTruthy();
    expect(wrapper.find('[data-test-subj="bulkDelete"]').exists()).toBeTruthy();
  });

  describe('bulk actions', () => {
    beforeAll(async () => {
      await setup();
    });

    beforeEach(() => {
      wrapper.find('[data-test-subj="checkboxSelectRow-1"]').at(1).simulate('change');
      wrapper.find('[data-test-subj="selectAllRulesButton"]').at(1).simulate('click');
      // Unselect something to test filtering
      wrapper.find('[data-test-subj="checkboxSelectRow-2"]').at(1).simulate('change');
      wrapper.find('[data-test-subj="showBulkActionButton"]').first().simulate('click');
    });

    it('can bulk snooze', async () => {
      wrapper.find('[data-test-subj="bulkSnooze"]').first().simulate('click');
      expect(wrapper.find('[data-test-subj="snoozePanel"]').exists()).toBeTruthy();
      wrapper.find('[data-test-subj="linkSnooze1h"]').first().simulate('click');

      await act(async () => {
        await nextTick();
        wrapper.update();
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
      wrapper.find('[data-test-subj="bulkUnsnooze"]').hostNodes().first().simulate('click');

      expect(
        wrapper.find('[data-test-subj="bulkUnsnoozeConfirmationModal"]').exists()
      ).toBeTruthy();

      wrapper
        .find('[data-test-subj="confirmModalConfirmButton"]')
        .hostNodes()
        .first()
        .simulate('click');

      await act(async () => {
        await nextTick();
        wrapper.update();
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

    it('can bulk add snooze schedule', async () => {
      wrapper.find('[data-test-subj="bulkSnoozeSchedule"]').hostNodes().first().simulate('click');
      expect(wrapper.find('[data-test-subj="ruleSnoozeScheduler"]').exists()).toBeTruthy();
      wrapper
        .find('[data-test-subj="scheduler-saveSchedule"]')
        .hostNodes()
        .first()
        .simulate('click');
      await act(async () => {
        await nextTick();
        wrapper.update();
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
      wrapper
        .find('[data-test-subj="bulkRemoveSnoozeSchedule"]')
        .hostNodes()
        .first()
        .simulate('click');
      expect(
        wrapper.find('[data-test-subj="bulkRemoveScheduleConfirmationModal"]').exists()
      ).toBeTruthy();
      wrapper
        .find('[data-test-subj="confirmModalConfirmButton"]')
        .hostNodes()
        .first()
        .simulate('click');

      await act(async () => {
        await nextTick();
        wrapper.update();
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

    it('can bulk update API key', async () => {
      wrapper.find('[data-test-subj="updateAPIKeys"]').hostNodes().first().simulate('click');
      expect(wrapper.find('[data-test-subj="updateApiKeyIdsConfirmation"]').exists()).toBeTruthy();
      wrapper
        .find('[data-test-subj="confirmModalConfirmButton"]')
        .hostNodes()
        .first()
        .simulate('click');
      await act(async () => {
        await nextTick();
        wrapper.update();
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
});
