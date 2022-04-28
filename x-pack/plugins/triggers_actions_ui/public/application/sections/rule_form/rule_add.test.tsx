/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import uuid from 'uuid';
import React, { FunctionComponent } from 'react';
import { mountWithIntl, nextTick } from '@kbn/test-jest-helpers';
import { act } from 'react-dom/test-utils';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiFormLabel } from '@elastic/eui';
import { coreMock } from '@kbn/core/public/mocks';
import RuleAdd from './rule_add';
import { createRule } from '../../lib/rule_api';
import { actionTypeRegistryMock } from '../../action_type_registry.mock';
import {
  Rule,
  RuleAddProps,
  RuleFlyoutCloseReason,
  ConnectorValidationResult,
  GenericValidationResult,
  ValidationResult,
} from '../../../types';
import { ruleTypeRegistryMock } from '../../rule_type_registry.mock';
import { ReactWrapper } from 'enzyme';
import { ALERTS_FEATURE_ID } from '@kbn/alerting-plugin/common';
import { useKibana } from '../../../common/lib/kibana';
import { triggersActionsUiConfig } from '../../../common/lib/config_api';

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

const actionTypeRegistry = actionTypeRegistryMock.create();
const ruleTypeRegistry = ruleTypeRegistryMock.create();
const useKibanaMock = useKibana as jest.Mocked<typeof useKibana>;

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
  let wrapper: ReactWrapper<any>;

  async function setup(
    initialValues?: Partial<Rule>,
    onClose: RuleAddProps['onClose'] = jest.fn(),
    defaultScheduleInterval?: string
  ) {
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
      validateConnector: (): Promise<ConnectorValidationResult<unknown, unknown>> => {
        return Promise.resolve({});
      },
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

    expect(wrapper.find('[data-test-subj="addRuleFlyoutTitle"]').exists()).toBeTruthy();
    expect(wrapper.find('[data-test-subj="saveRuleButton"]').exists()).toBeTruthy();

    wrapper.find('[data-test-subj="my-rule-type-SelectOption"]').first().simulate('click');

    expect(wrapper.find('input#ruleName').props().value).toBe('');

    expect(wrapper.find('[data-test-subj="tagsComboBox"]').first().text()).toBe('');

    expect(wrapper.find('.euiSelect').first().props().value).toBe('m');

    wrapper.find('[data-test-subj="cancelSaveRuleButton"]').first().simulate('click');
    expect(onClose).toHaveBeenCalledWith(RuleFlyoutCloseReason.CANCELED);
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
      onClose
    );

    expect(wrapper.find('input#ruleName').props().value).toBe('Simple status rule');
    expect(wrapper.find('[data-test-subj="tagsComboBox"]').first().text()).toBe('uptimelogs');
    expect(wrapper.find('[data-test-subj="intervalInput"]').first().props().value).toEqual(1);
    expect(wrapper.find('[data-test-subj="intervalInputUnit"]').first().props().value).toBe('h');
  });

  it('renders rule add flyout with DEFAULT_RULE_INTERVAL if no initialValues specified and no minimumScheduleInterval', async () => {
    (triggersActionsUiConfig as jest.Mock).mockResolvedValue({});
    await setup();

    expect(wrapper.find('[data-test-subj="intervalInput"]').first().props().value).toEqual(1);
    expect(wrapper.find('[data-test-subj="intervalInputUnit"]').first().props().value).toBe('m');
  });

  it('renders rule add flyout with minimumScheduleInterval if minimumScheduleInterval is greater than DEFAULT_RULE_INTERVAL', async () => {
    (triggersActionsUiConfig as jest.Mock).mockResolvedValue({
      minimumScheduleInterval: { value: '5m', enforce: false },
    });
    await setup();

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

    wrapper.find('[data-test-subj="saveRuleButton"]').first().simulate('click');

    // Wait for handlers to fire
    await act(async () => {
      await nextTick();
      wrapper.update();
    });

    expect(onClose).toHaveBeenCalledWith(RuleFlyoutCloseReason.SAVED);
  });

  it('should enforce any default interval', async () => {
    (triggersActionsUiConfig as jest.Mock).mockResolvedValue({
      minimumScheduleInterval: { value: '1m', enforce: false },
    });
    await setup({ ruleTypeId: 'my-rule-type' }, jest.fn(), '3h');

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
