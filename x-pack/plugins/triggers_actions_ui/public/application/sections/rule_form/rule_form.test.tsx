/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { mountWithIntl, nextTick } from '@kbn/test-jest-helpers';
import { ReactWrapper } from 'enzyme';
import { act } from 'react-dom/test-utils';
import { actionTypeRegistryMock } from '../../action_type_registry.mock';
import { ruleTypeRegistryMock } from '../../rule_type_registry.mock';
import { ActionForm } from '../action_connector_form';
import {
  ValidationResult,
  Rule,
  RuleType,
  RuleTypeModel,
  GenericValidationResult,
} from '../../../types';
import { RuleForm } from './rule_form';
import { coreMock } from '@kbn/core/public/mocks';
import { ALERTS_FEATURE_ID, RecoveredActionGroup } from '@kbn/alerting-plugin/common';
import { useKibana } from '../../../common/lib/kibana';

const actionTypeRegistry = actionTypeRegistryMock.create();
const ruleTypeRegistry = ruleTypeRegistryMock.create();

jest.mock('../../hooks/use_load_rule_types', () => ({
  useLoadRuleTypes: jest.fn(),
}));
jest.mock('../../../common/lib/kibana');
jest.mock('../../lib/capabilities', () => ({
  hasAllPrivilege: jest.fn(() => true),
  hasSaveRulesCapability: jest.fn(() => true),
  hasShowActionsCapability: jest.fn(() => true),
  hasExecuteActionsCapability: jest.fn(() => true),
}));

describe('rule_form', () => {
  const ruleType = {
    id: 'my-rule-type',
    iconClass: 'test',
    description: 'Rule when testing',
    documentationUrl: 'https://localhost.local/docs',
    validate: (): ValidationResult => {
      return { errors: {} };
    },
    ruleParamsExpression: () => <></>,
    requiresAppContext: false,
  };

  const actionType = actionTypeRegistryMock.createMockActionTypeModel({
    id: 'my-action-type',
    iconClass: 'test',
    selectMessage: 'test',
    validateParams: (): Promise<GenericValidationResult<unknown>> => {
      const validationResult = { errors: {} };
      return Promise.resolve(validationResult);
    },
    actionConnectorFields: null,
  });

  const ruleTypeNonEditable = {
    id: 'non-edit-rule-type',
    iconClass: 'test',
    description: 'test',
    documentationUrl: null,
    validate: (): ValidationResult => {
      return { errors: {} };
    },
    ruleParamsExpression: () => <></>,
    requiresAppContext: true,
  };

  const disabledByLicenseRuleType = {
    id: 'disabled-by-license',
    iconClass: 'test',
    description: 'Rule when testing',
    documentationUrl: 'https://localhost.local/docs',
    validate: (): ValidationResult => {
      return { errors: {} };
    },
    ruleParamsExpression: () => <></>,
    requiresAppContext: false,
  };

  const useKibanaMock = useKibana as jest.Mocked<typeof useKibana>;

  describe('rule recovery message', () => {
    let wrapper: ReactWrapper<any>;
    const defaultRecoveryMessage = 'Sample default recovery message';

    async function setup(enforceMinimum = false, schedule = '1m') {
      const mocks = coreMock.createSetup();
      const { useLoadRuleTypes } = jest.requireMock('../../hooks/use_load_rule_types');
      const myRuleModel = {
        id: 'my-rule-type',
        description: 'Sample rule type model',
        iconClass: 'sampleIconClass',
        defaultActionMessage: 'Sample default action message',
        defaultRecoveryMessage,
        requiresAppContext: false,
      };
      const myRule = {
        id: 'my-rule-type',
        name: 'Test',
        actionGroups: [
          {
            id: 'testActionGroup',
            name: 'Test Action Group',
          },
          {
            id: 'recovered',
            name: 'Recovered',
          },
        ],
        defaultActionGroupId: 'testActionGroup',
        minimumLicenseRequired: 'basic',
        recoveryActionGroup: RecoveredActionGroup,
        producer: ALERTS_FEATURE_ID,
        authorizedConsumers: {
          [ALERTS_FEATURE_ID]: { read: true, all: true },
          test: { read: true, all: true },
        },
        actionVariables: {
          params: [],
          state: [],
        },
        enabledInLicense: true,
      };
      const disabledByLicenseRule = {
        id: 'disabled-by-license',
        name: 'Test',
        actionGroups: [
          {
            id: 'testActionGroup',
            name: 'Test Action Group',
          },
        ],
        defaultActionGroupId: 'testActionGroup',
        minimumLicenseRequired: 'gold',
        recoveryActionGroup: RecoveredActionGroup,
        producer: ALERTS_FEATURE_ID,
        authorizedConsumers: {
          [ALERTS_FEATURE_ID]: { read: true, all: true },
          test: { read: true, all: true },
        },
        actionVariables: {
          params: [],
          state: [],
        },
        enabledInLicense: false,
      };
      useLoadRuleTypes.mockReturnValue({
        ruleTypes: [myRule, disabledByLicenseRule],
        ruleTypeIndex: new Map([
          [myRule.id, myRule],
          [disabledByLicenseRule.id, disabledByLicenseRule],
        ]),
      });
      const [
        {
          application: { capabilities },
        },
      ] = await mocks.getStartServices();
      // eslint-disable-next-line react-hooks/rules-of-hooks
      useKibanaMock().services.application.capabilities = {
        ...capabilities,
        rules: {
          show: true,
          save: true,
          delete: true,
        },
      };
      ruleTypeRegistry.list.mockReturnValue([
        ruleType,
        ruleTypeNonEditable,
        disabledByLicenseRuleType,
      ]);
      ruleTypeRegistry.has.mockReturnValue(true);
      ruleTypeRegistry.get.mockReturnValue(myRuleModel as RuleTypeModel);
      actionTypeRegistry.list.mockReturnValue([actionType]);
      actionTypeRegistry.has.mockReturnValue(true);
      actionTypeRegistry.get.mockReturnValue(actionType);
      const initialRule = {
        name: 'test',
        params: {},
        consumer: ALERTS_FEATURE_ID,
        schedule: {
          interval: schedule,
        },
        actions: [],
        tags: [],
        muteAll: false,
        enabled: false,
        mutedInstanceIds: [],
        ruleTypeId: 'my-rule-type',
      } as unknown as Rule;

      wrapper = mountWithIntl(
        <RuleForm
          rule={initialRule}
          config={{
            isUsingSecurity: true,
            minimumScheduleInterval: { value: '1m', enforce: enforceMinimum },
          }}
          dispatch={() => {}}
          errors={{ name: [], 'schedule.interval': [], ruleTypeId: [], actionConnectors: [] }}
          operation="create"
          actionTypeRegistry={actionTypeRegistry}
          ruleTypeRegistry={ruleTypeRegistry}
          onChangeMetaData={jest.fn()}
        />
      );

      await act(async () => {
        await nextTick();
        wrapper.update();
      });
    }

    it('renders defaultRecoveryMessage for recovery action when specified', async () => {
      await setup();
      const actionForm = wrapper.find(ActionForm);
      expect(actionForm.first().prop('actionGroups')?.[1]).toEqual(
        expect.objectContaining({ defaultActionMessage: defaultRecoveryMessage })
      );
    });
  });

  describe('rule_form create rule', () => {
    let wrapper: ReactWrapper<any>;

    async function setup(
      showRulesList = false,
      enforceMinimum = false,
      schedule = '1m',
      featureId = 'alerting'
    ) {
      const mocks = coreMock.createSetup();
      const { useLoadRuleTypes } = jest.requireMock('../../hooks/use_load_rule_types');
      const ruleTypes: RuleType[] = [
        {
          id: 'my-rule-type',
          name: 'Test',
          actionGroups: [
            {
              id: 'testActionGroup',
              name: 'Test Action Group',
            },
          ],
          defaultActionGroupId: 'testActionGroup',
          minimumLicenseRequired: 'basic',
          recoveryActionGroup: RecoveredActionGroup,
          producer: ALERTS_FEATURE_ID,
          authorizedConsumers: {
            [ALERTS_FEATURE_ID]: { read: true, all: true },
            test: { read: true, all: true },
          },
          actionVariables: {
            params: [],
            state: [],
          },
          enabledInLicense: true,
        },
        {
          id: 'disabled-by-license',
          name: 'Test',
          actionGroups: [
            {
              id: 'testActionGroup',
              name: 'Test Action Group',
            },
          ],
          defaultActionGroupId: 'testActionGroup',
          minimumLicenseRequired: 'gold',
          recoveryActionGroup: RecoveredActionGroup,
          producer: ALERTS_FEATURE_ID,
          authorizedConsumers: {
            [ALERTS_FEATURE_ID]: { read: true, all: true },
            test: { read: true, all: true },
          },
          actionVariables: {
            params: [],
            state: [],
          },
          enabledInLicense: false,
        },
      ];
      useLoadRuleTypes.mockReturnValue({ ruleTypes });
      const [
        {
          application: { capabilities },
        },
      ] = await mocks.getStartServices();
      // eslint-disable-next-line react-hooks/rules-of-hooks
      useKibanaMock().services.application.capabilities = {
        ...capabilities,
        rules: {
          show: true,
          save: true,
          delete: true,
        },
      };
      ruleTypeRegistry.list.mockReturnValue([
        ruleType,
        ruleTypeNonEditable,
        disabledByLicenseRuleType,
      ]);
      ruleTypeRegistry.has.mockReturnValue(true);
      actionTypeRegistry.list.mockReturnValue([actionType]);
      actionTypeRegistry.has.mockReturnValue(true);
      actionTypeRegistry.get.mockReturnValue(actionType);
      const initialRule = {
        name: 'test',
        params: {},
        consumer: ALERTS_FEATURE_ID,
        schedule: {
          interval: schedule,
        },
        actions: [],
        tags: [],
        muteAll: false,
        enabled: false,
        mutedInstanceIds: [],
        ...(!showRulesList ? { ruleTypeId: ruleType.id } : {}),
      } as unknown as Rule;

      wrapper = mountWithIntl(
        <RuleForm
          rule={initialRule}
          config={{
            isUsingSecurity: true,
            minimumScheduleInterval: { value: '1m', enforce: enforceMinimum },
          }}
          dispatch={() => {}}
          errors={{ name: [], 'schedule.interval': [], ruleTypeId: [] }}
          operation="create"
          actionTypeRegistry={actionTypeRegistry}
          ruleTypeRegistry={ruleTypeRegistry}
          connectorFeatureId={featureId}
          onChangeMetaData={jest.fn()}
        />
      );

      await act(async () => {
        await nextTick();
        wrapper.update();
      });
    }

    it('renders rule name', async () => {
      await setup();
      const ruleNameField = wrapper.find('[data-test-subj="ruleNameInput"]');
      expect(ruleNameField.exists()).toBeTruthy();
      expect(ruleNameField.first().prop('value')).toBe('test');
    });

    it('renders registered selected rule type', async () => {
      await setup(true);
      const ruleTypeSelectOptions = wrapper.find('[data-test-subj="my-rule-type-SelectOption"]');
      expect(ruleTypeSelectOptions.exists()).toBeTruthy();
    });

    it('renders minimum schedule interval helper text when enforce = true', async () => {
      await setup(false, true);
      expect(wrapper.find('[data-test-subj="intervalFormRow"]').first().prop('helpText')).toEqual(
        `Interval must be at least 1 minute.`
      );
    });

    it('renders minimum schedule interval helper suggestion when enforce = false and schedule is less than configuration', async () => {
      await setup(false, false, '10s');
      expect(wrapper.find('[data-test-subj="intervalFormRow"]').first().prop('helpText')).toEqual(
        `Intervals less than 1 minute are not recommended due to performance considerations.`
      );
    });

    it('does not render minimum schedule interval helper when enforce = false and schedule is greater than configuration', async () => {
      await setup();
      expect(wrapper.find('[data-test-subj="intervalFormRow"]').first().prop('helpText')).toEqual(
        ``
      );
    });

    it('handles schedule interval inputs correctly', async () => {
      const getIntervalInput = () => {
        return wrapper.find('[data-test-subj="intervalInput"] input').first();
      };

      await setup();
      expect(getIntervalInput().props().value).toEqual(1);

      getIntervalInput().simulate('change', { target: { value: '2' } });
      expect(getIntervalInput().props().value).toEqual(2);

      getIntervalInput().simulate('change', { target: { value: '20' } });
      expect(getIntervalInput().props().value).toEqual(20);

      getIntervalInput().simulate('change', { target: { value: '999' } });
      expect(getIntervalInput().props().value).toEqual(999);

      // Invalid values:
      await setup();
      getIntervalInput().simulate('change', { target: { value: '0' } });
      expect(getIntervalInput().props().value).toEqual(1);

      getIntervalInput().simulate('change', { target: { value: 'INVALID' } });
      expect(getIntervalInput().props().value).toEqual(1);

      getIntervalInput().simulate('change', { target: { value: '-123' } });
      expect(getIntervalInput().props().value).toEqual(1);

      getIntervalInput().simulate('change', { target: { value: '1.0123' } });
      expect(getIntervalInput().props().value).toEqual(1);

      getIntervalInput().simulate('change', { target: { value: '0.0123' } });
      expect(getIntervalInput().props().value).toEqual(1);

      getIntervalInput().simulate('change', { target: { value: '+123' } });
      expect(getIntervalInput().props().value).toEqual(1);
    });

    it('does not render registered rule type which non editable', async () => {
      await setup();
      const ruleTypeSelectOptions = wrapper.find(
        '[data-test-subj="non-edit-rule-type-SelectOption"]'
      );
      expect(ruleTypeSelectOptions.exists()).toBeFalsy();
    });

    it('renders registered action types', async () => {
      await setup();
      const ruleTypeSelectOptions = wrapper.find(
        '[data-test-subj=".server-log-alerting-ActionTypeSelectOption"]'
      );
      expect(ruleTypeSelectOptions.exists()).toBeFalsy();
    });

    it('renders uses feature id to load action types', async () => {
      await setup(false, false, '1m', 'anotherFeature');
      const ruleTypeSelectOptions = wrapper.find(
        '[data-test-subj=".server-log-anotherFeature-ActionTypeSelectOption"]'
      );
      expect(ruleTypeSelectOptions.exists()).toBeFalsy();
    });

    it('renders rule type description', async () => {
      await setup(true);
      wrapper.find('button[data-test-subj="my-rule-type-SelectOption"]').first().simulate('click');
      const ruleDescription = wrapper.find('[data-test-subj="ruleDescription"]');
      expect(ruleDescription.exists()).toBeTruthy();
      expect(ruleDescription.first().text()).toContain('Rule when testing');
    });

    it('renders rule type documentation link', async () => {
      await setup(true);
      wrapper.find('button[data-test-subj="my-rule-type-SelectOption"]').first().simulate('click');
      const ruleDocumentationLink = wrapper.find('[data-test-subj="ruleDocumentationLink"]');
      expect(ruleDocumentationLink.exists()).toBeTruthy();
      expect(ruleDocumentationLink.first().prop('href')).toBe('https://localhost.local/docs');
    });

    it('renders rule types disabled by license', async () => {
      await setup(true);
      const actionOption = wrapper.find(`[data-test-subj="disabled-by-license-SelectOption"]`);
      expect(actionOption.exists()).toBeTruthy();
      expect(
        wrapper.find('[data-test-subj="disabled-by-license-disabledTooltip"]').exists()
      ).toBeTruthy();
    });
  });

  describe('rule_form create rule non ruleing consumer and producer', () => {
    let wrapper: ReactWrapper<any>;

    async function setup() {
      const { useLoadRuleTypes } = jest.requireMock('../../hooks/use_load_rule_types');
      useLoadRuleTypes.mockReturnValue({
        ruleTypes: [
          {
            id: 'other-consumer-producer-rule-type',
            name: 'Test',
            actionGroups: [
              {
                id: 'testActionGroup',
                name: 'Test Action Group',
              },
            ],
            defaultActionGroupId: 'testActionGroup',
            minimumLicenseRequired: 'basic',
            recoveryActionGroup: RecoveredActionGroup,
            producer: ALERTS_FEATURE_ID,
            authorizedConsumers: {
              [ALERTS_FEATURE_ID]: { read: true, all: true },
              test: { read: true, all: true },
            },
          },
          {
            id: 'same-consumer-producer-rule-type',
            name: 'Test',
            actionGroups: [
              {
                id: 'testActionGroup',
                name: 'Test Action Group',
              },
            ],
            defaultActionGroupId: 'testActionGroup',
            minimumLicenseRequired: 'basic',
            recoveryActionGroup: RecoveredActionGroup,
            producer: 'test',
            authorizedConsumers: {
              [ALERTS_FEATURE_ID]: { read: true, all: true },
              test: { read: true, all: true },
            },
          },
        ],
      });
      const mocks = coreMock.createSetup();
      const [
        {
          application: { capabilities },
        },
      ] = await mocks.getStartServices();
      // eslint-disable-next-line react-hooks/rules-of-hooks
      useKibanaMock().services.application.capabilities = {
        ...capabilities,
        rules: {
          show: true,
          save: true,
          delete: true,
        },
      };
      ruleTypeRegistry.list.mockReturnValue([
        {
          id: 'same-consumer-producer-rule-type',
          iconClass: 'test',
          description: 'test',
          documentationUrl: null,
          validate: (): ValidationResult => {
            return { errors: {} };
          },
          ruleParamsExpression: () => <></>,
          requiresAppContext: true,
        },
        {
          id: 'other-consumer-producer-rule-type',
          iconClass: 'test',
          description: 'test',
          documentationUrl: null,
          validate: (): ValidationResult => {
            return { errors: {} };
          },
          ruleParamsExpression: () => <></>,
          requiresAppContext: false,
        },
      ]);
      ruleTypeRegistry.has.mockReturnValue(true);
      actionTypeRegistry.get.mockReturnValue(actionType);

      const initialRule = {
        name: 'non ruleing consumer test',
        params: {},
        consumer: 'test',
        schedule: {
          interval: '1m',
        },
        actions: [],
        tags: [],
        muteAll: false,
        enabled: false,
        mutedInstanceIds: [],
      } as unknown as Rule;

      wrapper = mountWithIntl(
        <RuleForm
          rule={initialRule}
          config={{
            isUsingSecurity: true,
            minimumScheduleInterval: { value: '1m', enforce: false },
          }}
          dispatch={() => {}}
          errors={{ name: [], 'schedule.interval': [], ruleTypeId: [], actionConnectors: [] }}
          operation="create"
          actionTypeRegistry={actionTypeRegistry}
          ruleTypeRegistry={ruleTypeRegistry}
          onChangeMetaData={jest.fn()}
        />
      );

      await act(async () => {
        await nextTick();
        wrapper.update();
      });

      expect(useLoadRuleTypes).toHaveBeenCalled();
    }

    it('renders rule type options which producer correspond to the rule consumer', async () => {
      await setup();
      const ruleTypeSelectOptions = wrapper.find(
        '[data-test-subj="same-consumer-producer-rule-type-SelectOption"]'
      );
      expect(ruleTypeSelectOptions.exists()).toBeTruthy();
    });

    it('does not render rule type options which producer does not correspond to the rule consumer', async () => {
      await setup();
      const ruleTypeSelectOptions = wrapper.find(
        '[data-test-subj="other-consumer-producer-rule-type-SelectOption"]'
      );
      expect(ruleTypeSelectOptions.exists()).toBeFalsy();
    });
  });

  describe('rule_form edit rule', () => {
    let wrapper: ReactWrapper<any>;

    async function setup() {
      ruleTypeRegistry.list.mockReturnValue([ruleType]);
      ruleTypeRegistry.get.mockReturnValue(ruleType);
      ruleTypeRegistry.has.mockReturnValue(true);
      actionTypeRegistry.list.mockReturnValue([actionType]);
      actionTypeRegistry.has.mockReturnValue(true);
      actionTypeRegistry.get.mockReturnValue(actionType);

      const initialRule = {
        name: 'test',
        ruleTypeId: ruleType.id,
        params: {},
        consumer: ALERTS_FEATURE_ID,
        schedule: {
          interval: '1m',
        },
        actions: [],
        tags: [],
        muteAll: false,
        enabled: false,
        mutedInstanceIds: [],
      } as unknown as Rule;

      wrapper = mountWithIntl(
        <RuleForm
          rule={initialRule}
          config={{
            isUsingSecurity: true,
            minimumScheduleInterval: { value: '1m', enforce: false },
          }}
          dispatch={() => {}}
          errors={{ name: [], 'schedule.interval': [], ruleTypeId: [] }}
          operation="create"
          actionTypeRegistry={actionTypeRegistry}
          ruleTypeRegistry={ruleTypeRegistry}
          onChangeMetaData={jest.fn()}
        />
      );

      await act(async () => {
        await nextTick();
        wrapper.update();
      });
    }

    it('renders rule name', async () => {
      await setup();
      const ruleNameField = wrapper.find('[data-test-subj="ruleNameInput"]');
      expect(ruleNameField.exists()).toBeTruthy();
      expect(ruleNameField.first().prop('value')).toBe('test');
    });

    it('renders registered selected rule type', async () => {
      await setup();
      const ruleTypeSelectOptions = wrapper.find('[data-test-subj="selectedRuleTypeTitle"]');
      expect(ruleTypeSelectOptions.exists()).toBeTruthy();
    });

    it('renders rule type description', async () => {
      await setup();
      const ruleDescription = wrapper.find('[data-test-subj="ruleDescription"]');
      expect(ruleDescription.exists()).toBeTruthy();
      expect(ruleDescription.first().text()).toContain('Rule when testing');
    });

    it('renders rule type documentation link', async () => {
      await setup();
      const ruleDocumentationLink = wrapper.find('[data-test-subj="ruleDocumentationLink"]');
      expect(ruleDocumentationLink.exists()).toBeTruthy();
      expect(ruleDocumentationLink.first().prop('href')).toBe('https://localhost.local/docs');
    });
  });
});
