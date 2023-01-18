/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuid } from 'uuid';
import React, { FunctionComponent } from 'react';
import { mountWithIntl, nextTick } from '@kbn/test-jest-helpers';
import { act } from 'react-dom/test-utils';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiFormLabel } from '@elastic/eui';
import { coreMock } from '@kbn/core/public/mocks';
import RuleAdd from './rule_add';
import { createRule, alertingFrameworkHealth } from '../../lib/rule_api';
import { actionTypeRegistryMock } from '../../action_type_registry.mock';
import {
  Rule,
  RuleAddProps,
  RuleFlyoutCloseReason,
  GenericValidationResult,
  ValidationResult,
} from '../../../types';
import { ruleTypeRegistryMock } from '../../rule_type_registry.mock';
import { ReactWrapper } from 'enzyme';
import { ALERTS_FEATURE_ID } from '@kbn/alerting-plugin/common';
import { useKibana } from '../../../common/lib/kibana';
import { triggersActionsUiConfig } from '../../../common/lib/config_api';
import { triggersActionsUiHealth } from '../../../common/lib/health_api';
import { loadActionTypes, loadAllActions } from '../../lib/action_connector_api';

jest.mock('../../../common/lib/kibana');

jest.mock('../../lib/rule_api', () => ({
  loadRuleTypes: jest.fn(),
  createRule: jest.fn(),
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

describe('rule_add', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  afterAll(() => {
    jest.resetAllMocks();
  });
  let wrapper: ReactWrapper<any>;

  async function setup(
    initialValues?: Partial<Rule>,
    onClose: RuleAddProps['onClose'] = jest.fn(),
    defaultScheduleInterval?: string,
    ruleTypeId?: string,
    actionsShow: boolean = false
  ) {
    const useKibanaMock = useKibana as jest.Mocked<typeof useKibana>;
    const mocks = coreMock.createSetup();
    const { loadRuleTypes } = jest.requireMock('../../lib/rule_api');
    const ruleTypes = [
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
        producer: ALERTS_FEATURE_ID,
        authorizedConsumers: {
          [ALERTS_FEATURE_ID]: { read: true, all: true },
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

    const ruleType = {
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
      <RuleAdd
        consumer={ALERTS_FEATURE_ID}
        onClose={onClose}
        initialValues={initialValues}
        onSave={() => {
          return new Promise<void>(() => {});
        }}
        actionTypeRegistry={actionTypeRegistry}
        ruleTypeRegistry={ruleTypeRegistry}
        metadata={{ test: 'some value', fields: ['test'] }}
        ruleTypeId={ruleTypeId}
      />
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
    await setup({}, onClose);

    await act(async () => {
      await nextTick();
      wrapper.update();
    });

    expect(wrapper.find('[data-test-subj="addRuleFlyoutTitle"]').exists()).toBeTruthy();
    expect(wrapper.find('[data-test-subj="saveRuleButton"]').exists()).toBeTruthy();

    wrapper.find('[data-test-subj="cancelSaveRuleButton"]').last().simulate('click');
    expect(onClose).toHaveBeenCalledWith(RuleFlyoutCloseReason.CANCELED, {
      fields: ['test'],
      test: 'some value',
    });
  });

  it('renders a confirm close modal if the flyout is closed after inputs have changed', async () => {
    (triggersActionsUiConfig as jest.Mock).mockResolvedValue({
      minimumScheduleInterval: { value: '1m', enforce: false },
    });
    const onClose = jest.fn();
    await setup({}, onClose);

    await act(async () => {
      await nextTick();
      wrapper.update();
    });

    wrapper.find('[data-test-subj="my-rule-type-SelectOption"]').last().simulate('click');
    expect(wrapper.find('input#ruleName').props().value).toBe('');
    expect(wrapper.find('[data-test-subj="tagsComboBox"]').first().text()).toBe('');
    expect(wrapper.find('.euiSelect').first().props().value).toBe('m');

    wrapper.find('[data-test-subj="cancelSaveRuleButton"]').last().simulate('click');
    expect(onClose).not.toHaveBeenCalled();
    expect(wrapper.find('[data-test-subj="confirmRuleCloseModal"]').exists()).toBe(true);
  });

  it('renders rule add flyout with initial values', async () => {
    (triggersActionsUiConfig as jest.Mock).mockResolvedValue({
      minimumScheduleInterval: { value: '1m', enforce: false },
    });
    const onClose = jest.fn();
    await setup(
      {
        name: 'Simple status rule',
        tags: ['uptime', 'logs'],
        schedule: {
          interval: '1h',
        },
      },
      onClose,
      undefined,
      'my-rule-type'
    );

    expect(wrapper.find('input#ruleName').props().value).toBe('Simple status rule');
    expect(wrapper.find('[data-test-subj="tagsComboBox"]').first().text()).toBe('uptimelogs');
    expect(wrapper.find('[data-test-subj="intervalInput"]').first().props().value).toEqual(1);
    expect(wrapper.find('[data-test-subj="intervalInputUnit"]').first().props().value).toBe('h');
  });

  it('renders rule add flyout with DEFAULT_RULE_INTERVAL if no initialValues specified and no minimumScheduleInterval', async () => {
    (triggersActionsUiConfig as jest.Mock).mockResolvedValue({});
    await setup(undefined, undefined, undefined, 'my-rule-type');

    expect(wrapper.find('[data-test-subj="intervalInput"]').first().props().value).toEqual(1);
    expect(wrapper.find('[data-test-subj="intervalInputUnit"]').first().props().value).toBe('m');
  });

  it('renders rule add flyout with minimumScheduleInterval if minimumScheduleInterval is greater than DEFAULT_RULE_INTERVAL', async () => {
    (triggersActionsUiConfig as jest.Mock).mockResolvedValue({
      minimumScheduleInterval: { value: '5m', enforce: false },
    });
    await setup(undefined, undefined, undefined, 'my-rule-type');

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

    await setup(
      {
        name: 'Simple status rule',
        ruleTypeId: 'my-rule-type',
        tags: ['uptime', 'logs'],
        schedule: {
          interval: '1h',
        },
      },
      onClose
    );

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

  it('should enforce any default interval', async () => {
    (triggersActionsUiConfig as jest.Mock).mockResolvedValue({
      minimumScheduleInterval: { value: '1m', enforce: false },
    });
    await setup({ ruleTypeId: 'my-rule-type' }, jest.fn(), '3h', 'my-rule-type', true);

    // Wait for handlers to fire
    await act(async () => {
      await nextTick();
      wrapper.update();
    });

    const intervalInputUnit = wrapper
      .find('[data-test-subj="intervalInputUnit"]')
      .first()
      .getElement().props.value;
    const intervalInput = wrapper.find('[data-test-subj="intervalInput"]').first().getElement()
      .props.value;
    expect(intervalInputUnit).toBe('h');
    expect(intervalInput).toBe(3);
  });

  it('should load connectors and connector types when there is a pre-selected rule type', async () => {
    (triggersActionsUiConfig as jest.Mock).mockResolvedValue({
      minimumScheduleInterval: { value: '1m', enforce: false },
    });

    await setup({}, jest.fn(), undefined, 'my-rule-type', true);

    expect(triggersActionsUiHealth).toHaveBeenCalledTimes(1);
    expect(alertingFrameworkHealth).toHaveBeenCalledTimes(1);
    expect(loadActionTypes).toHaveBeenCalledTimes(1);
    expect(loadAllActions).toHaveBeenCalledTimes(1);
  });

  it('should not load connectors and connector types when there is not an encryptionKey', async () => {
    (triggersActionsUiConfig as jest.Mock).mockResolvedValue({
      minimumScheduleInterval: { value: '1m', enforce: false },
    });
    (alertingFrameworkHealth as jest.Mock).mockResolvedValue({
      isSufficientlySecure: true,
      hasPermanentEncryptionKey: false,
    });

    await setup({}, jest.fn(), undefined, 'my-rule-type', true);

    expect(triggersActionsUiHealth).toHaveBeenCalledTimes(1);
    expect(alertingFrameworkHealth).toHaveBeenCalledTimes(1);
    expect(loadActionTypes).not.toHaveBeenCalled();
    expect(loadAllActions).not.toHaveBeenCalled();
    expect(wrapper.find('[data-test-subj="actionNeededEmptyPrompt"]').first().text()).toContain(
      'You must configure an encryption key to use Alerting'
    );
  });
});

function mockRule(overloads: Partial<Rule> = {}): Rule {
  return {
    id: uuid.v4(),
    enabled: true,
    name: `rule-${uuid.v4()}`,
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
    ...overloads,
  };
}
