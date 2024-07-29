/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FunctionComponent } from 'react';
import { EuiFormLabel } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { mountWithIntl, nextTick } from '@kbn/test-jest-helpers';
import { ReactWrapper } from 'enzyme';
import { act } from 'react-dom/test-utils';
import { actionTypeRegistryMock } from '../../action_type_registry.mock';
import { ruleTypeRegistryMock } from '../../rule_type_registry.mock';
import { ActionForm } from '../action_connector_form';
import { AlertConsumers, OBSERVABILITY_THRESHOLD_RULE_TYPE_ID } from '@kbn/rule-data-utils';
import { RuleFormConsumerSelection } from './rule_form_consumer_selection';
import {
  ValidationResult,
  Rule,
  RuleType,
  RuleTypeModel,
  GenericValidationResult,
  RuleCreationValidConsumer,
} from '../../../types';
import { RuleForm } from './rule_form';
import { coreMock } from '@kbn/core/public/mocks';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ALERTING_FEATURE_ID, RecoveredActionGroup } from '@kbn/alerting-plugin/common';
import { useKibana } from '../../../common/lib/kibana';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      cacheTime: 0,
    },
  },
});

const toMapById = [
  (acc: Map<unknown, unknown>, val: { id: unknown }) => acc.set(val.id, val),
  new Map(),
] as const;

const actionTypeRegistry = actionTypeRegistryMock.create();
const ruleTypeRegistry = ruleTypeRegistryMock.create();

const mockSetConsumer = jest.fn();

export const TestExpression: FunctionComponent<any> = () => {
  return (
    <EuiFormLabel>
      <FormattedMessage
        defaultMessage="Metadata: {val}. Fields: {fields}."
        id="xpack.triggersActionsUI.sections.ruleAdd.metadataTest"
        values={{ val: 'test', fields: '' }}
      />
    </EuiFormLabel>
  );
};

jest.mock('../../hooks/use_load_rule_types_query', () => ({
  useLoadRuleTypesQuery: jest.fn(),
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
      const { useLoadRuleTypesQuery } = jest.requireMock('../../hooks/use_load_rule_types_query');
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
        producer: ALERTING_FEATURE_ID,
        authorizedConsumers: {
          [ALERTING_FEATURE_ID]: { read: true, all: true },
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
        producer: ALERTING_FEATURE_ID,
        authorizedConsumers: {
          [ALERTING_FEATURE_ID]: { read: true, all: true },
          test: { read: true, all: true },
        },
        actionVariables: {
          params: [],
          state: [],
        },
        enabledInLicense: false,
      };
      useLoadRuleTypesQuery.mockReturnValue({
        ruleTypesState: {
          data: new Map([
            [myRule.id, myRule],
            [disabledByLicenseRule.id, disabledByLicenseRule],
          ]),
        },
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
        consumer: ALERTING_FEATURE_ID,
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
        <QueryClientProvider client={queryClient}>
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
        </QueryClientProvider>
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

    async function setup(options?: {
      showRulesList?: boolean;
      enforceMinimum?: boolean;
      schedule?: string;
      featureId?: string;
      initialRuleOverwrite?: Partial<Rule>;
      validConsumers?: RuleCreationValidConsumer[];
      ruleTypesOverwrite?: RuleType[];
      ruleTypeModelOverwrite?: RuleTypeModel;
      useRuleProducer?: boolean;
      selectedConsumer?: RuleCreationValidConsumer | null;
    }) {
      const {
        showRulesList = false,
        enforceMinimum = false,
        schedule = '1m',
        featureId = 'alerting',
        initialRuleOverwrite,
        validConsumers,
        ruleTypesOverwrite,
        ruleTypeModelOverwrite,
        useRuleProducer = false,
        selectedConsumer,
      } = options || {};

      const mocks = coreMock.createSetup();
      const { useLoadRuleTypesQuery } = jest.requireMock('../../hooks/use_load_rule_types_query');
      const ruleTypes: RuleType[] = ruleTypesOverwrite || [
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
          producer: ALERTING_FEATURE_ID,
          authorizedConsumers: {
            [ALERTING_FEATURE_ID]: { read: true, all: true },
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
          producer: ALERTING_FEATURE_ID,
          authorizedConsumers: {
            [ALERTING_FEATURE_ID]: { read: true, all: true },
            test: { read: true, all: true },
          },
          actionVariables: {
            params: [],
            state: [],
          },
          enabledInLicense: false,
        },
      ];
      useLoadRuleTypesQuery.mockReturnValue({
        ruleTypesState: {
          data: ruleTypes.reduce(...toMapById),
        },
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
        ruleTypeModelOverwrite || ruleType,
        ruleTypeNonEditable,
        disabledByLicenseRuleType,
      ]);
      ruleTypeRegistry.get.mockReturnValue(ruleTypeModelOverwrite || ruleType);
      ruleTypeRegistry.has.mockReturnValue(true);
      actionTypeRegistry.list.mockReturnValue([actionType]);
      actionTypeRegistry.has.mockReturnValue(true);
      actionTypeRegistry.get.mockReturnValue(actionType);
      const initialRule = {
        name: 'test',
        params: {},
        consumer: ALERTING_FEATURE_ID,
        schedule: {
          interval: schedule,
        },
        actions: [],
        tags: [],
        muteAll: false,
        enabled: false,
        mutedInstanceIds: [],
        ...(!showRulesList ? { ruleTypeId: ruleType.id } : {}),
        alertDelay: {
          active: 1,
        },
      } as unknown as Rule;

      wrapper = mountWithIntl(
        <QueryClientProvider client={queryClient}>
          <RuleForm
            canShowConsumerSelection
            rule={{
              ...initialRule,
              ...initialRuleOverwrite,
            }}
            config={{
              isUsingSecurity: true,
              minimumScheduleInterval: { value: '1m', enforce: enforceMinimum },
            }}
            dispatch={() => {}}
            errors={{ name: [], 'schedule.interval': [], ruleTypeId: [], actionConnectors: [] }}
            operation="create"
            actionTypeRegistry={actionTypeRegistry}
            ruleTypeRegistry={ruleTypeRegistry}
            connectorFeatureId={featureId}
            onChangeMetaData={jest.fn()}
            validConsumers={validConsumers}
            setConsumer={mockSetConsumer}
            useRuleProducer={useRuleProducer}
            selectedConsumer={selectedConsumer}
          />
        </QueryClientProvider>
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
      await setup({ showRulesList: true });
      const ruleTypeSelectOptions = wrapper.find('[data-test-subj="my-rule-type-SelectOption"]');
      expect(ruleTypeSelectOptions.exists()).toBeTruthy();
    });

    it('renders minimum schedule interval helper text when enforce = true', async () => {
      await setup({ enforceMinimum: true });
      expect(wrapper.find('[data-test-subj="intervalFormRow"]').first().prop('helpText')).toEqual(
        `Interval must be at least 1 minute.`
      );
    });

    it('renders minimum schedule interval helper suggestion when enforce = false and schedule is less than configuration', async () => {
      await setup({ schedule: '10s' });
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
      await setup({ schedule: '1m', featureId: 'anotherFeature' });
      const ruleTypeSelectOptions = wrapper.find(
        '[data-test-subj=".server-log-anotherFeature-ActionTypeSelectOption"]'
      );
      expect(ruleTypeSelectOptions.exists()).toBeFalsy();
    });

    it('renders rule type description', async () => {
      await setup({ showRulesList: true });
      wrapper.find('button[data-test-subj="my-rule-type-SelectOption"]').first().simulate('click');
      const ruleDescription = wrapper.find('[data-test-subj="ruleDescription"]');
      expect(ruleDescription.exists()).toBeTruthy();
      expect(ruleDescription.first().text()).toContain('Rule when testing');
    });

    it('renders rule type documentation link', async () => {
      await setup({ showRulesList: true });
      wrapper.find('button[data-test-subj="my-rule-type-SelectOption"]').first().simulate('click');
      const ruleDocumentationLink = wrapper.find('[data-test-subj="ruleDocumentationLink"]');
      expect(ruleDocumentationLink.exists()).toBeTruthy();
      expect(ruleDocumentationLink.first().prop('href')).toBe('https://localhost.local/docs');
    });

    it('renders rule types disabled by license', async () => {
      await setup({ showRulesList: true });
      const actionOption = wrapper.find(`[data-test-subj="disabled-by-license-SelectOption"]`);
      expect(actionOption.exists()).toBeTruthy();
      expect(
        wrapper.find('[data-test-subj="disabled-by-license-disabledTooltip"]').exists()
      ).toBeTruthy();
    });

    it('should select the only one available consumer', async () => {
      await setup({
        initialRuleOverwrite: {
          name: 'Simple rule',
          consumer: 'alerts',
          ruleTypeId: OBSERVABILITY_THRESHOLD_RULE_TYPE_ID,
          schedule: {
            interval: '1h',
          },
        },
        ruleTypesOverwrite: [
          {
            id: OBSERVABILITY_THRESHOLD_RULE_TYPE_ID,
            name: 'Threshold Rule 1',
            actionGroups: [
              {
                id: 'testActionGroup',
                name: 'Test Action Group',
              },
            ],
            enabledInLicense: true,
            defaultActionGroupId: 'threshold.fired',
            minimumLicenseRequired: 'basic',
            recoveryActionGroup: { id: 'recovered', name: 'Recovered' },
            producer: ALERTING_FEATURE_ID,
            authorizedConsumers: {
              alerts: { read: true, all: true },
              apm: { read: true, all: true },
              discover: { read: true, all: true },
              infrastructure: { read: true, all: true },
              // Setting logs all to false, this shouldn't show up
              logs: { read: true, all: false },
              ml: { read: true, all: true },
              monitoring: { read: true, all: true },
              siem: { read: true, all: true },
              slo: { read: true, all: false },
              stackAlerts: { read: true, all: true },
              uptime: { read: true, all: true },
            },
            actionVariables: {
              context: [],
              state: [],
              params: [],
            },
          },
        ],
        ruleTypeModelOverwrite: {
          id: OBSERVABILITY_THRESHOLD_RULE_TYPE_ID,
          iconClass: 'test',
          description: 'test',
          documentationUrl: null,
          validate: (): ValidationResult => {
            return { errors: {} };
          },
          ruleParamsExpression: TestExpression,
          requiresAppContext: false,
        },
        validConsumers: [AlertConsumers.INFRASTRUCTURE, AlertConsumers.LOGS],
      });

      await act(async () => {
        await nextTick();
        wrapper.update();
      });
      expect(wrapper.find('[data-test-subj="ruleFormConsumerSelect"]').exists()).toBeFalsy();

      await act(async () => {
        await nextTick();
        wrapper.update();
      });
      expect(mockSetConsumer).toHaveBeenLastCalledWith('infrastructure');
    });

    it('should render multiple consumers in the dropdown and select the first one in the list if no default is specified', async () => {
      await setup({
        initialRuleOverwrite: {
          name: 'Simple rule',
          consumer: 'alerts',
          ruleTypeId: OBSERVABILITY_THRESHOLD_RULE_TYPE_ID,
          schedule: {
            interval: '1h',
          },
        },
        ruleTypesOverwrite: [
          {
            id: OBSERVABILITY_THRESHOLD_RULE_TYPE_ID,
            name: 'Threshold Rule',
            actionGroups: [
              {
                id: 'testActionGroup',
                name: 'Test Action Group',
              },
            ],
            enabledInLicense: true,
            defaultActionGroupId: 'threshold.fired',
            minimumLicenseRequired: 'basic',
            recoveryActionGroup: { id: 'recovered', name: 'Recovered' },
            producer: ALERTING_FEATURE_ID,
            authorizedConsumers: {
              infrastructure: { read: true, all: true },
              logs: { read: true, all: true },
            },
            actionVariables: {
              context: [],
              state: [],
              params: [],
            },
          },
        ],
        ruleTypeModelOverwrite: {
          id: OBSERVABILITY_THRESHOLD_RULE_TYPE_ID,
          iconClass: 'test',
          description: 'test',
          documentationUrl: null,
          validate: (): ValidationResult => {
            return { errors: {} };
          },
          ruleParamsExpression: TestExpression,
          requiresAppContext: false,
        },
      });

      await act(async () => {
        await nextTick();
        wrapper.update();
      });

      expect(wrapper.find('[data-test-subj="ruleFormConsumerSelect"]').exists()).toBeTruthy();
      expect(wrapper.find(RuleFormConsumerSelection).props().consumers).toEqual([
        'infrastructure',
        'logs',
      ]);
      await act(async () => {
        await nextTick();
        wrapper.update();
      });

      expect(mockSetConsumer).toHaveBeenLastCalledWith('infrastructure');
    });

    it('should not display the consumer select for invalid rule types', async () => {
      await setup();

      await act(async () => {
        await nextTick();
        wrapper.update();
      });

      expect(wrapper.find('[data-test-subj="ruleFormConsumerSelect"]').exists()).toBeFalsy();
    });

    it('Do not show alert query in action when we do not have  hasFieldsForAAD or hasAlertsMappings or belong to security', async () => {
      await setup({
        initialRuleOverwrite: {
          name: 'Simple rule',
          consumer: 'alerts',
          ruleTypeId: 'my-rule-type',
          schedule: {
            interval: '1h',
          },
        },
        ruleTypesOverwrite: [
          {
            id: 'my-rule-type',
            name: 'Threshold Rule',
            actionGroups: [
              {
                id: 'testActionGroup',
                name: 'Test Action Group',
              },
            ],
            enabledInLicense: true,
            defaultActionGroupId: 'threshold.fired',
            minimumLicenseRequired: 'basic',
            recoveryActionGroup: { id: 'recovered', name: 'Recovered' },
            producer: ALERTING_FEATURE_ID,
            authorizedConsumers: {
              infrastructure: { read: true, all: true },
              logs: { read: true, all: true },
            },
            actionVariables: {
              context: [],
              state: [],
              params: [],
            },
            hasFieldsForAAD: false,
            hasAlertsMappings: false,
          },
        ],
        ruleTypeModelOverwrite: {
          id: 'my-rule-type',
          iconClass: 'test',
          description: 'test',
          documentationUrl: null,
          validate: (): ValidationResult => {
            return { errors: {} };
          },
          ruleParamsExpression: TestExpression,
          requiresAppContext: false,
        },
      });

      await act(async () => {
        await nextTick();
        wrapper.update();
      });

      expect(wrapper.find(ActionForm).props().hasFieldsForAAD).toEqual(false);
    });

    it('Show alert query in action when rule type  hasFieldsForAAD', async () => {
      await setup({
        initialRuleOverwrite: {
          name: 'Simple rule',
          consumer: 'alerts',
          ruleTypeId: 'my-rule-type',
          schedule: {
            interval: '1h',
          },
        },
        ruleTypesOverwrite: [
          {
            id: 'my-rule-type',
            name: 'Threshold Rule',
            actionGroups: [
              {
                id: 'testActionGroup',
                name: 'Test Action Group',
              },
            ],
            enabledInLicense: true,
            defaultActionGroupId: 'threshold.fired',
            minimumLicenseRequired: 'basic',
            recoveryActionGroup: { id: 'recovered', name: 'Recovered' },
            producer: ALERTING_FEATURE_ID,
            authorizedConsumers: {
              infrastructure: { read: true, all: true },
              logs: { read: true, all: true },
            },
            actionVariables: {
              context: [],
              state: [],
              params: [],
            },
            hasFieldsForAAD: true,
            hasAlertsMappings: false,
          },
        ],
        ruleTypeModelOverwrite: {
          id: 'my-rule-type',
          iconClass: 'test',
          description: 'test',
          documentationUrl: null,
          validate: (): ValidationResult => {
            return { errors: {} };
          },
          ruleParamsExpression: TestExpression,
          requiresAppContext: false,
        },
      });

      await act(async () => {
        await nextTick();
        wrapper.update();
      });

      expect(wrapper.find(ActionForm).props().hasFieldsForAAD).toEqual(true);
    });

    it('Show alert query in action when rule type  hasAlertsMappings', async () => {
      await setup({
        initialRuleOverwrite: {
          name: 'Simple rule',
          consumer: 'alerts',
          ruleTypeId: 'my-rule-type',
          schedule: {
            interval: '1h',
          },
        },
        ruleTypesOverwrite: [
          {
            id: 'my-rule-type',
            name: 'Threshold Rule',
            actionGroups: [
              {
                id: 'testActionGroup',
                name: 'Test Action Group',
              },
            ],
            enabledInLicense: true,
            defaultActionGroupId: 'threshold.fired',
            minimumLicenseRequired: 'basic',
            recoveryActionGroup: { id: 'recovered', name: 'Recovered' },
            producer: ALERTING_FEATURE_ID,
            authorizedConsumers: {
              infrastructure: { read: true, all: true },
              logs: { read: true, all: true },
            },
            actionVariables: {
              context: [],
              state: [],
              params: [],
            },
            hasFieldsForAAD: false,
            hasAlertsMappings: true,
          },
        ],
        ruleTypeModelOverwrite: {
          id: 'my-rule-type',
          iconClass: 'test',
          description: 'test',
          documentationUrl: null,
          validate: (): ValidationResult => {
            return { errors: {} };
          },
          ruleParamsExpression: TestExpression,
          requiresAppContext: false,
        },
      });

      await act(async () => {
        await nextTick();
        wrapper.update();
      });

      expect(wrapper.find(ActionForm).props().hasFieldsForAAD).toEqual(true);
    });

    it('Show alert query in action when rule type is from security solution', async () => {
      await setup({
        initialRuleOverwrite: {
          name: 'Simple rule',
          consumer: 'siem',
          ruleTypeId: 'my-rule-type',
          schedule: {
            interval: '1h',
          },
        },
        ruleTypesOverwrite: [
          {
            id: 'my-rule-type',
            name: 'Threshold Rule',
            actionGroups: [
              {
                id: 'testActionGroup',
                name: 'Test Action Group',
              },
            ],
            enabledInLicense: true,
            defaultActionGroupId: 'threshold.fired',
            minimumLicenseRequired: 'basic',
            recoveryActionGroup: { id: 'recovered', name: 'Recovered' },
            producer: 'siem',
            authorizedConsumers: {
              infrastructure: { read: true, all: true },
              logs: { read: true, all: true },
            },
            actionVariables: {
              context: [],
              state: [],
              params: [],
            },
            hasFieldsForAAD: false,
            hasAlertsMappings: false,
          },
        ],
        ruleTypeModelOverwrite: {
          id: 'my-rule-type',
          iconClass: 'test',
          description: 'test',
          documentationUrl: null,
          validate: (): ValidationResult => {
            return { errors: {} };
          },
          ruleParamsExpression: TestExpression,
          requiresAppContext: false,
        },
      });

      await act(async () => {
        await nextTick();
        wrapper.update();
      });

      expect(wrapper.find(ActionForm).props().hasFieldsForAAD).toEqual(true);
    });

    it('show alert query in action when multi consumer rule type does not have a consumer selected', async () => {
      await setup({
        initialRuleOverwrite: {
          name: 'Simple rule',
          consumer: 'alerts',
          ruleTypeId: OBSERVABILITY_THRESHOLD_RULE_TYPE_ID,
          schedule: {
            interval: '1h',
          },
        },
        ruleTypesOverwrite: [
          {
            id: OBSERVABILITY_THRESHOLD_RULE_TYPE_ID,
            name: 'Threshold Rule',
            actionGroups: [
              {
                id: 'testActionGroup',
                name: 'Test Action Group',
              },
            ],
            enabledInLicense: true,
            defaultActionGroupId: 'threshold.fired',
            minimumLicenseRequired: 'basic',
            recoveryActionGroup: { id: 'recovered', name: 'Recovered' },
            producer: ALERTING_FEATURE_ID,
            authorizedConsumers: {
              infrastructure: { read: true, all: true },
              logs: { read: true, all: true },
            },
            actionVariables: {
              context: [],
              state: [],
              params: [],
            },
            hasFieldsForAAD: true,
            hasAlertsMappings: true,
          },
        ],
        ruleTypeModelOverwrite: {
          id: OBSERVABILITY_THRESHOLD_RULE_TYPE_ID,
          iconClass: 'test',
          description: 'test',
          documentationUrl: null,
          validate: (): ValidationResult => {
            return { errors: {} };
          },
          ruleParamsExpression: TestExpression,
          requiresAppContext: false,
        },
        selectedConsumer: 'logs',
      });

      await act(async () => {
        await nextTick();
        wrapper.update();
      });

      expect(wrapper.find(ActionForm).props().hasFieldsForAAD).toEqual(true);
    });

    it('renders rule alert delay', async () => {
      const getAlertDelayInput = () => {
        return wrapper.find('[data-test-subj="alertDelayInput"] input').first();
      };

      await setup();
      // expect the accordion to be closed by default
      expect(wrapper.find('.euiAccordion-isOpen').exists()).toBeFalsy();

      expect(getAlertDelayInput().props().value).toEqual(1);

      getAlertDelayInput().simulate('change', { target: { value: '2' } });
      expect(getAlertDelayInput().props().value).toEqual(2);

      getAlertDelayInput().simulate('change', { target: { value: '20' } });
      expect(getAlertDelayInput().props().value).toEqual(20);

      getAlertDelayInput().simulate('change', { target: { value: '999' } });
      expect(getAlertDelayInput().props().value).toEqual(999);
    });
  });

  describe('rule_form create rule non ruleing consumer and producer', () => {
    let wrapper: ReactWrapper<any>;

    async function setup() {
      const { useLoadRuleTypesQuery } = jest.requireMock('../../hooks/use_load_rule_types_query');
      useLoadRuleTypesQuery.mockReturnValue({
        ruleTypesState: {
          data: [
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
              producer: ALERTING_FEATURE_ID,
              authorizedConsumers: {
                [ALERTING_FEATURE_ID]: { read: true, all: true },
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
                [ALERTING_FEATURE_ID]: { read: true, all: true },
                test: { read: true, all: true },
              },
            },
          ].reduce(...toMapById),
        },
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
        <QueryClientProvider client={queryClient}>
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
        </QueryClientProvider>
      );

      await act(async () => {
        await nextTick();
        wrapper.update();
      });

      expect(useLoadRuleTypesQuery).toHaveBeenCalled();
    }

    it('renders rule type options which producer correspond to the rule consumer', async () => {
      await setup();
      const ruleTypeSelectOptions = wrapper.find(
        '[data-test-subj="same-consumer-producer-rule-type-SelectOption"]'
      );
      expect(ruleTypeSelectOptions.exists()).toBeTruthy();
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
        consumer: ALERTING_FEATURE_ID,
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
        <QueryClientProvider client={queryClient}>
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
        </QueryClientProvider>
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
