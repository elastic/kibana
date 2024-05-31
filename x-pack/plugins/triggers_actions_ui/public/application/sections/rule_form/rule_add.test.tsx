/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import React, { FunctionComponent } from 'react';
import { mountWithIntl, nextTick } from '@kbn/test-jest-helpers';
import { act } from 'react-dom/test-utils';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiFormLabel } from '@elastic/eui';
import { coreMock } from '@kbn/core/public/mocks';
import RuleAdd from './rule_add';
import { createRule } from '../../lib/rule_api/create';
import { alertingFrameworkHealth } from '../../lib/rule_api/health';
import { actionTypeRegistryMock } from '../../action_type_registry.mock';
import { AlertConsumers, OBSERVABILITY_THRESHOLD_RULE_TYPE_ID } from '@kbn/rule-data-utils';
import {
  Rule,
  RuleAddProps,
  RuleFlyoutCloseReason,
  GenericValidationResult,
  ValidationResult,
  RuleCreationValidConsumer,
  RuleType,
  RuleTypeModel,
} from '../../../types';
import { ruleTypeRegistryMock } from '../../rule_type_registry.mock';
import { ReactWrapper } from 'enzyme';
import { ALERTING_FEATURE_ID } from '@kbn/alerting-plugin/common';
import { useKibana } from '../../../common/lib/kibana';
import { triggersActionsUiConfig } from '../../../common/lib/config_api';
import { triggersActionsUiHealth } from '../../../common/lib/health_api';
import { loadActionTypes, loadAllActions } from '../../lib/action_connector_api';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { waitFor } from '@testing-library/react';
jest.mock('../../../common/lib/kibana');

jest.mock('../../lib/rule_api/rule_types', () => ({
  loadRuleTypes: jest.fn(),
}));
jest.mock('../../lib/rule_api/create', () => ({
  createRule: jest.fn(),
}));
jest.mock('../../lib/rule_api/health', () => ({
  alertingFrameworkHealth: jest.fn(() => ({
    isSufficientlySecure: true,
    hasPermanentEncryptionKey: true,
  })),
}));

jest.mock('../../../common/lib/config_api', () => ({
  triggersActionsUiConfig: jest.fn(),
}));

jest.mock('../../../common/lib/health_api', () => ({
  triggersActionsUiHealth: jest.fn(() => ({ isRulesAvailable: true })),
}));

jest.mock('../../lib/action_connector_api', () => ({
  loadActionTypes: jest.fn(),
  loadAllActions: jest.fn(),
}));

const actionTypeRegistry = actionTypeRegistryMock.create();
const ruleTypeRegistry = ruleTypeRegistryMock.create();

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

// FLAKY: https://github.com/elastic/kibana/issues/174397
describe.skip('rule_add', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  afterAll(() => {
    jest.resetAllMocks();
  });
  let wrapper: ReactWrapper<any>;

  async function setup({
    initialValues,
    onClose = jest.fn(),
    defaultScheduleInterval,
    ruleTypeId,
    actionsShow = false,
    validConsumers,
    ruleTypesOverwrite,
    ruleTypeModelOverwrite,
  }: {
    initialValues?: Partial<Rule>;
    onClose?: RuleAddProps['onClose'];
    defaultScheduleInterval?: string;
    ruleTypeId?: string;
    actionsShow?: boolean;
    validConsumers?: RuleCreationValidConsumer[];
    ruleTypesOverwrite?: RuleType[];
    ruleTypeModelOverwrite?: RuleTypeModel;
  }) {
    const useKibanaMock = useKibana as jest.Mocked<typeof useKibana>;
    const mocks = coreMock.createSetup();
    const { loadRuleTypes } = jest.requireMock('../../lib/rule_api/rule_types');

    const ruleTypes = ruleTypesOverwrite || [
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
        defaultScheduleInterval,
        minimumLicenseRequired: 'basic',
        recoveryActionGroup: { id: 'recovered', name: 'Recovered' },
        producer: ALERTING_FEATURE_ID,
        authorizedConsumers: {
          [ALERTING_FEATURE_ID]: { read: true, all: true },
          test: { read: true, all: true },
        },
        actionVariables: {
          context: [],
          state: [],
          params: [],
        },
      },
    ];
    loadRuleTypes.mockResolvedValue(ruleTypes);
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
      actions: {
        show: actionsShow,
      },
    };

    mocks.http.get.mockResolvedValue({
      isSufficientlySecure: true,
      hasPermanentEncryptionKey: true,
    });

    const ruleType = ruleTypeModelOverwrite || {
      id: 'my-rule-type',
      iconClass: 'test',
      description: 'test',
      documentationUrl: null,
      validate: (): ValidationResult => {
        return { errors: {} };
      },
      ruleParamsExpression: TestExpression,
      requiresAppContext: false,
    };

    const actionTypeModel = actionTypeRegistryMock.createMockActionTypeModel({
      id: 'my-action-type',
      iconClass: 'test',
      selectMessage: 'test',
      validateParams: (): Promise<GenericValidationResult<unknown>> => {
        const validationResult = { errors: {} };
        return Promise.resolve(validationResult);
      },
      actionConnectorFields: null,
    });
    actionTypeRegistry.get.mockReturnValueOnce(actionTypeModel);
    actionTypeRegistry.has.mockReturnValue(true);
    ruleTypeRegistry.list.mockReturnValue([ruleType]);
    ruleTypeRegistry.get.mockReturnValue(ruleType);
    ruleTypeRegistry.has.mockReturnValue(true);
    actionTypeRegistry.list.mockReturnValue([actionTypeModel]);
    actionTypeRegistry.has.mockReturnValue(true);

    wrapper = mountWithIntl(
      <QueryClientProvider client={new QueryClient()}>
        <RuleAdd
          consumer={ALERTING_FEATURE_ID}
          onClose={onClose}
          initialValues={initialValues}
          onSave={() => {
            return new Promise<void>(() => {});
          }}
          actionTypeRegistry={actionTypeRegistry}
          ruleTypeRegistry={ruleTypeRegistry}
          metadata={{ test: 'some value', fields: ['test'] }}
          ruleTypeId={ruleTypeId}
          validConsumers={validConsumers}
        />
      </QueryClientProvider>
    );

    // Wait for active space to resolve before requesting the component to update
    await act(async () => {
      await nextTick();
      wrapper.update();
    });
  }

  it('renders rule add flyout', async () => {
    (triggersActionsUiConfig as jest.Mock).mockResolvedValue({
      minimumScheduleInterval: { value: '1m', enforce: false },
    });
    const onClose = jest.fn();
    await setup({
      initialValues: {},
      onClose,
    });

    await act(async () => {
      await nextTick();
      wrapper.update();
    });

    expect(wrapper.find('[data-test-subj="addRuleFlyoutTitle"]').exists()).toBeTruthy();
    expect(wrapper.find('[data-test-subj="saveRuleButton"]').exists()).toBeTruthy();
    expect(wrapper.find('[data-test-subj="showRequestButton"]').exists()).toBeTruthy();

    wrapper.find('[data-test-subj="cancelSaveRuleButton"]').last().simulate('click');
    expect(onClose).toHaveBeenCalledWith(RuleFlyoutCloseReason.CANCELED, {
      fields: ['test'],
      test: 'some value',
    });
  });

  it('renders selection of rule types to pick in the modal', async () => {
    (triggersActionsUiConfig as jest.Mock).mockResolvedValue({
      minimumScheduleInterval: { value: '1m', enforce: false },
    });
    const onClose = jest.fn();
    await setup({
      initialValues: {},
      onClose,
    });

    await act(async () => {
      await nextTick();
      wrapper.update();
    });

    await waitFor(() => {
      const ruleTypesContainer = wrapper.find('[data-test-subj="ruleGroupTypeSelectContainer"]');
      const ruleTypeButton = ruleTypesContainer
        .render()
        .find('[data-test-subj="my-rule-type-SelectOption"]');

      expect(ruleTypeButton.length).toEqual(1);
      expect(ruleTypeButton.text()).toMatchInlineSnapshot(`"Testtest"`);
    });
  });

  it('renders a confirm close modal if the flyout is closed after inputs have changed', async () => {
    (triggersActionsUiConfig as jest.Mock).mockResolvedValue({
      minimumScheduleInterval: { value: '1m', enforce: false },
    });
    const onClose = jest.fn();
    await setup({
      initialValues: {},
      onClose,
      ruleTypeId: 'my-rule-type',
    });

    await act(async () => {
      await nextTick();
      wrapper.update();
    });

    wrapper
      .find('input#ruleName')
      .at(0)
      .simulate('change', { target: { value: 'my rule type' } });

    await waitFor(() => {
      expect(wrapper.find('input#ruleName').props().value).toBe('my rule type');
      expect(wrapper.find('[data-test-subj="tagsComboBox"]').first().text()).toBe('');
      expect(wrapper.find('.euiSelect').first().props().value).toBe('m');

      wrapper.find('[data-test-subj="cancelSaveRuleButton"]').last().simulate('click');
      expect(onClose).not.toHaveBeenCalled();
      expect(wrapper.find('[data-test-subj="confirmRuleCloseModal"]').exists()).toBe(true);
    });
  });

  it('renders rule add flyout with initial values', async () => {
    (triggersActionsUiConfig as jest.Mock).mockResolvedValue({
      minimumScheduleInterval: { value: '1m', enforce: false },
    });
    const onClose = jest.fn();
    await setup({
      initialValues: {
        name: 'Simple status rule',
        tags: ['uptime', 'logs'],
        schedule: {
          interval: '1h',
        },
      },
      onClose,
      ruleTypeId: 'my-rule-type',
    });

    expect(wrapper.find('input#ruleName').props().value).toBe('Simple status rule');
    expect(wrapper.find('[data-test-subj="tagsComboBox"]').first().text()).toBe('uptimelogs');
    expect(wrapper.find('[data-test-subj="intervalInput"]').first().props().value).toEqual(1);
    expect(wrapper.find('[data-test-subj="intervalInputUnit"]').first().props().value).toBe('h');
  });

  it('renders rule add flyout with DEFAULT_RULE_INTERVAL if no initialValues specified and no minimumScheduleInterval', async () => {
    (triggersActionsUiConfig as jest.Mock).mockResolvedValue({});
    await setup({ ruleTypeId: 'my-rule-type' });

    expect(wrapper.find('[data-test-subj="intervalInput"]').first().props().value).toEqual(1);
    expect(wrapper.find('[data-test-subj="intervalInputUnit"]').first().props().value).toBe('m');
  });

  it('renders rule add flyout with minimumScheduleInterval if minimumScheduleInterval is greater than DEFAULT_RULE_INTERVAL', async () => {
    (triggersActionsUiConfig as jest.Mock).mockResolvedValue({
      minimumScheduleInterval: { value: '5m', enforce: false },
    });
    await setup({ ruleTypeId: 'my-rule-type' });

    expect(wrapper.find('[data-test-subj="intervalInput"]').first().props().value).toEqual(5);
    expect(wrapper.find('[data-test-subj="intervalInputUnit"]').first().props().value).toBe('m');
  });

  it('emit an onClose event when the rule is saved', async () => {
    (triggersActionsUiConfig as jest.Mock).mockResolvedValue({
      minimumScheduleInterval: { value: '1m', enforce: false },
    });
    const onClose = jest.fn();
    const rule = mockRule();

    (createRule as jest.MockedFunction<typeof createRule>).mockResolvedValue(rule);

    await setup({
      initialValues: {
        name: 'Simple status rule',
        ruleTypeId: 'my-rule-type',
        tags: ['uptime', 'logs'],
        schedule: {
          interval: '1h',
        },
      },
      onClose,
    });

    wrapper.find('[data-test-subj="saveRuleButton"]').last().simulate('click');

    // Wait for handlers to fire
    await act(async () => {
      await nextTick();
      wrapper.update();
    });

    expect(onClose).toHaveBeenCalledWith(RuleFlyoutCloseReason.SAVED, {
      test: 'some value',
      fields: ['test'],
    });
  });

  it('should set consumer automatically if only 1 authorized consumer exists', async () => {
    (triggersActionsUiConfig as jest.Mock).mockResolvedValue({
      minimumScheduleInterval: { value: '1m', enforce: false },
    });
    const onClose = jest.fn();
    await setup({
      initialValues: {
        name: 'Simple rule',
        consumer: 'alerts',
        ruleTypeId: OBSERVABILITY_THRESHOLD_RULE_TYPE_ID,
        tags: ['uptime', 'logs'],
        schedule: {
          interval: '1h',
        },
      },
      onClose,
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
      validConsumers: [AlertConsumers.INFRASTRUCTURE, AlertConsumers.LOGS],
    });

    await act(async () => {
      await nextTick();
      wrapper.update();
    });

    expect(wrapper.find('[data-test-subj="addRuleFlyoutTitle"]').exists()).toBeTruthy();
    expect(wrapper.find('[data-test-subj="saveRuleButton"]').exists()).toBeTruthy();

    wrapper.find('[data-test-subj="saveRuleButton"]').last().simulate('click');

    await act(async () => {
      await nextTick();
      wrapper.update();
    });

    await waitFor(() => {
      expect(createRule).toHaveBeenLastCalledWith(
        expect.objectContaining({
          rule: expect.objectContaining({
            consumer: 'logs',
          }),
        })
      );
    });
  });

  it('should enforce any default interval', async () => {
    (triggersActionsUiConfig as jest.Mock).mockResolvedValue({
      minimumScheduleInterval: { value: '1m', enforce: false },
    });
    await setup({
      initialValues: { ruleTypeId: 'my-rule-type' },
      onClose: jest.fn(),
      defaultScheduleInterval: '3h',
      ruleTypeId: 'my-rule-type',
      actionsShow: true,
    });

    // Wait for handlers to fire
    await act(async () => {
      await nextTick();
      wrapper.update();
    });

    await waitFor(() => {
      const intervalInputUnit = wrapper
        .find('[data-test-subj="intervalInputUnit"]')
        .first()
        .getElement().props.value;
      const intervalInput = wrapper.find('[data-test-subj="intervalInput"]').first().getElement()
        .props.value;
      expect(intervalInputUnit).toBe('h');
      expect(intervalInput).toBe(3);
    });
  });

  it('should load connectors and connector types when there is a pre-selected rule type', async () => {
    (triggersActionsUiConfig as jest.Mock).mockResolvedValue({
      minimumScheduleInterval: { value: '1m', enforce: false },
    });

    await setup({
      initialValues: {},
      onClose: jest.fn(),
      ruleTypeId: 'my-rule-type',
      actionsShow: true,
    });

    // Wait for handlers to fire
    await act(async () => {
      await nextTick();
      wrapper.update();
    });

    await waitFor(() => {
      expect(triggersActionsUiHealth).toHaveBeenCalledTimes(1);
      expect(alertingFrameworkHealth).toHaveBeenCalledTimes(1);
      expect(loadActionTypes).toHaveBeenCalledTimes(1);
      expect(loadAllActions).toHaveBeenCalledTimes(1);
    });
  });

  it('should not load connectors and connector types when there is not an encryptionKey', async () => {
    (triggersActionsUiConfig as jest.Mock).mockResolvedValue({
      minimumScheduleInterval: { value: '1m', enforce: false },
    });
    (alertingFrameworkHealth as jest.Mock).mockResolvedValue({
      isSufficientlySecure: true,
      hasPermanentEncryptionKey: false,
    });

    await setup({
      initialValues: {},
      onClose: jest.fn(),
      ruleTypeId: 'my-rule-type',
      actionsShow: true,
    });

    // Wait for handlers to fire
    await act(async () => {
      await nextTick();
      wrapper.update();
    });

    await waitFor(() => {
      expect(triggersActionsUiHealth).toHaveBeenCalledTimes(1);
      expect(alertingFrameworkHealth).toHaveBeenCalledTimes(1);
      expect(loadActionTypes).not.toHaveBeenCalled();
      expect(loadAllActions).not.toHaveBeenCalled();
      expect(wrapper.find('[data-test-subj="actionNeededEmptyPrompt"]').first().text()).toContain(
        'You must configure an encryption key to use Alerting'
      );
    });
  });
});

function mockRule(overloads: Partial<Rule> = {}): Rule {
  return {
    id: uuidv4(),
    enabled: true,
    name: `rule-${uuidv4()}`,
    tags: [],
    ruleTypeId: '.noop',
    consumer: 'consumer',
    schedule: { interval: '1m' },
    actions: [],
    params: {},
    createdBy: null,
    updatedBy: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    apiKeyOwner: null,
    throttle: null,
    notifyWhen: null,
    muteAll: false,
    mutedInstanceIds: [],
    executionStatus: {
      status: 'unknown',
      lastExecutionDate: new Date('2020-08-20T19:23:38Z'),
    },
    revision: 0,
    ...overloads,
  };
}
