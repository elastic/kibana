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
import {
  ValidationResult,
  Rule,
  RuleType,
  ConnectorValidationResult,
  GenericValidationResult,
} from '../../../types';
import { RuleForm } from './rule_form';
import { coreMock } from 'src/core/public/mocks';
import { ALERTS_FEATURE_ID, RecoveredActionGroup } from '../../../../../alerting/common';
import { useKibana } from '../../../common/lib/kibana';

const actionTypeRegistry = actionTypeRegistryMock.create();
const ruleTypeRegistry = ruleTypeRegistryMock.create();

jest.mock('../../hooks/use_load_rule_types', () => ({
  useLoadRuleTypes: jest.fn(),
}));
jest.mock('../../../common/lib/kibana');

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
    validateConnector: (): Promise<ConnectorValidationResult<unknown, unknown>> => {
      return Promise.resolve({
        config: {
          errors: {},
        },
        secrets: {
          errors: {},
        },
      });
    },
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

  describe('rule_form create rule', () => {
    let wrapper: ReactWrapper<any>;

    async function setup() {
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
          config={{ minimumScheduleInterval: '1m' }}
          dispatch={() => {}}
          errors={{ name: [], 'schedule.interval': [], ruleTypeId: [] }}
          operation="create"
          actionTypeRegistry={actionTypeRegistry}
          ruleTypeRegistry={ruleTypeRegistry}
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
      const ruleTypeSelectOptions = wrapper.find('[data-test-subj="my-rule-type-SelectOption"]');
      expect(ruleTypeSelectOptions.exists()).toBeTruthy();
    });

    it('renders minimum schedule interval', async () => {
      await setup();
      expect(wrapper.find('[data-test-subj="intervalFormRow"]').first().prop('helpText')).toEqual(
        `Interval must be at least 1 minute.`
      );
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
        '[data-test-subj=".server-log-ActionTypeSelectOption"]'
      );
      expect(ruleTypeSelectOptions.exists()).toBeFalsy();
    });

    it('renders rule type description', async () => {
      await setup();
      wrapper.find('button[data-test-subj="my-rule-type-SelectOption"]').first().simulate('click');
      const ruleDescription = wrapper.find('[data-test-subj="ruleDescription"]');
      expect(ruleDescription.exists()).toBeTruthy();
      expect(ruleDescription.first().text()).toContain('Rule when testing');
    });

    it('renders rule type documentation link', async () => {
      await setup();
      wrapper.find('button[data-test-subj="my-rule-type-SelectOption"]').first().simulate('click');
      const ruleDocumentationLink = wrapper.find('[data-test-subj="ruleDocumentationLink"]');
      expect(ruleDocumentationLink.exists()).toBeTruthy();
      expect(ruleDocumentationLink.first().prop('href')).toBe('https://localhost.local/docs');
    });

    it('renders rule types disabled by license', async () => {
      await setup();
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
          config={{ minimumScheduleInterval: '1m' }}
          dispatch={() => {}}
          errors={{ name: [], 'schedule.interval': [], ruleTypeId: [] }}
          operation="create"
          actionTypeRegistry={actionTypeRegistry}
          ruleTypeRegistry={ruleTypeRegistry}
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
          config={{ minimumScheduleInterval: '1m' }}
          dispatch={() => {}}
          errors={{ name: [], 'schedule.interval': [], ruleTypeId: [] }}
          operation="create"
          actionTypeRegistry={actionTypeRegistry}
          ruleTypeRegistry={ruleTypeRegistry}
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
