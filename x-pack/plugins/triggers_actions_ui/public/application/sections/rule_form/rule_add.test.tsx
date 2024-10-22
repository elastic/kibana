/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import React, { FunctionComponent } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { render, screen, within } from '@testing-library/react';

import { EuiFormLabel } from '@elastic/eui';
import { coreMock } from '@kbn/core/public/mocks';
import RuleAdd from './rule_add';
import { createRule } from '@kbn/alerts-ui-shared/src/common/apis/create_rule';

import { fetchAlertingFrameworkHealth as fetchAlertingFrameworkHealth } from '@kbn/alerts-ui-shared/src/common/apis/fetch_alerting_framework_health';
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
import { ALERTING_FEATURE_ID } from '@kbn/alerting-plugin/common';
import { useKibana } from '../../../common/lib/kibana';

import { fetchUiConfig } from '@kbn/alerts-ui-shared/src/common/apis/fetch_ui_config';
import { fetchUiHealthStatus } from '@kbn/alerts-ui-shared/src/common/apis/fetch_ui_health_status';
import { loadActionTypes, loadAllActions } from '../../lib/action_connector_api';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { waitFor } from '@testing-library/react';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import userEvent from '@testing-library/user-event';
jest.mock('../../../common/lib/kibana');

jest.mock('../../lib/rule_api/rule_types', () => ({
  loadRuleTypes: jest.fn(),
}));
jest.mock('@kbn/alerts-ui-shared/src/common/apis/create_rule', () => ({
  createRule: jest.fn(),
}));
jest.mock('@kbn/alerts-ui-shared/src/common/apis/fetch_alerting_framework_health', () => ({
  fetchAlertingFrameworkHealth: jest.fn(() => ({
    isSufficientlySecure: true,
    hasPermanentEncryptionKey: true,
  })),
}));

jest.mock('@kbn/alerts-ui-shared/src/common/apis/fetch_ui_config', () => ({
  fetchUiConfig: jest.fn(),
}));

jest.mock('@kbn/alerts-ui-shared/src/common/apis/fetch_ui_health_status', () => ({
  fetchUiHealthStatus: jest.fn(() => ({ isRulesAvailable: true })),
}));

jest.mock('../../lib/action_connector_api', () => ({
  loadActionTypes: jest.fn(),
  loadAllActions: jest.fn(),
}));

jest.mock('@kbn/alerts-ui-shared/src/common/apis/fetch_flapping_settings', () => ({
  fetchFlappingSettings: jest.fn().mockResolvedValue({
    lookBackWindow: 20,
    statusChangeThreshold: 20,
  }),
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
      rulesSettings: {
        writeFlappingSettingsUI: true,
      },
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

    return {
      consumer: ALERTING_FEATURE_ID,
      onClose,
      initialValues,
      onSave: () => {
        return new Promise<void>(() => {});
      },
      actionTypeRegistry,
      ruleTypeRegistry,
      metadata: { test: 'some value', fields: ['test'] },
      ruleTypeId,
      validConsumers,
    };
  }

  it('renders rule add flyout', async () => {
    (fetchUiConfig as jest.Mock).mockResolvedValue({
      minimumScheduleInterval: { value: '1m', enforce: false },
    });

    const onClose = jest.fn();
    const props = await setup({
      initialValues: {},
      onClose,
    });

    render(
      <IntlProvider locale="en">
        <QueryClientProvider client={new QueryClient()}>
          <RuleAdd {...props} />
        </QueryClientProvider>
      </IntlProvider>
    );

    expect(await screen.findByTestId('addRuleFlyoutTitle')).toBeInTheDocument();

    expect(await screen.findByTestId('saveRuleButton')).toBeInTheDocument();
    expect(await screen.findByTestId('showRequestButton')).toBeInTheDocument();

    await userEvent.click(await screen.findByTestId('cancelSaveRuleButton'));
    expect(onClose).toHaveBeenCalledWith(RuleFlyoutCloseReason.CANCELED, {
      fields: ['test'],
      test: 'some value',
    });
  });

  it('renders selection of rule types to pick in the modal', async () => {
    (fetchUiConfig as jest.Mock).mockResolvedValue({
      minimumScheduleInterval: { value: '1m', enforce: false },
    });
    const onClose = jest.fn();
    const props = await setup({
      initialValues: {},
      onClose,
    });

    render(
      <IntlProvider locale="en">
        <QueryClientProvider client={new QueryClient()}>
          <RuleAdd {...props} />
        </QueryClientProvider>
      </IntlProvider>
    );

    expect(await screen.findByTestId('my-rule-type-SelectOption')).toBeInTheDocument();

    expect(await screen.findByText('Test')).toBeInTheDocument();
    expect(await screen.findByText('test')).toBeInTheDocument();
  });

  it('renders a confirm close modal if the flyout is closed after inputs have changed', async () => {
    (fetchUiConfig as jest.Mock).mockResolvedValue({
      minimumScheduleInterval: { value: '1m', enforce: false },
    });
    const onClose = jest.fn();

    const props = await setup({
      initialValues: {},
      onClose,
      ruleTypeId: 'my-rule-type',
    });

    render(
      <IntlProvider locale="en">
        <QueryClientProvider client={new QueryClient()}>
          <RuleAdd {...props} />
        </QueryClientProvider>
      </IntlProvider>
    );

    expect(await screen.findByTestId('ruleNameInput')).toBeInTheDocument();

    await userEvent.type(await screen.findByTestId('ruleNameInput'), 'my[Space]rule[Space]type');

    expect(await screen.findByTestId('ruleNameInput')).toHaveValue('my rule type');
    expect(await screen.findByTestId('comboBoxSearchInput')).toHaveValue('');
    expect(await screen.findByTestId('intervalInputUnit')).toHaveValue('m');

    await userEvent.click(await screen.findByTestId('cancelSaveRuleButton'));

    expect(onClose).not.toHaveBeenCalled();
    expect(await screen.findByTestId('confirmRuleCloseModal')).toBeInTheDocument();
  });

  it('renders rule add flyout with initial values', async () => {
    (fetchUiConfig as jest.Mock).mockResolvedValue({
      minimumScheduleInterval: { value: '1m', enforce: false },
    });
    const onClose = jest.fn();
    const props = await setup({
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

    render(
      <IntlProvider locale="en">
        <QueryClientProvider client={new QueryClient()}>
          <RuleAdd {...props} />
        </QueryClientProvider>
      </IntlProvider>
    );

    expect(await screen.findByTestId('ruleNameInput')).toHaveValue('Simple status rule');

    expect(
      await within(await screen.findByTestId('tagsComboBox')).findByText('uptime')
    ).toBeInTheDocument();
    expect(
      await within(await screen.findByTestId('tagsComboBox')).findByText('logs')
    ).toBeInTheDocument();

    expect(await screen.findByTestId('intervalInput')).toHaveValue(1);
    expect(await screen.findByTestId('intervalInputUnit')).toHaveValue('h');
  });

  it('renders rule add flyout with DEFAULT_RULE_INTERVAL if no initialValues specified and no minimumScheduleInterval', async () => {
    (fetchUiConfig as jest.Mock).mockResolvedValue({});
    const props = await setup({ ruleTypeId: 'my-rule-type' });

    render(
      <IntlProvider locale="en">
        <QueryClientProvider client={new QueryClient()}>
          <RuleAdd {...props} />
        </QueryClientProvider>
      </IntlProvider>
    );

    expect(await screen.findByTestId('intervalInput')).toHaveValue(1);

    expect(await screen.findByTestId('intervalInputUnit')).toHaveValue('m');
  });

  it('renders rule add flyout with minimumScheduleInterval if minimumScheduleInterval is greater than DEFAULT_RULE_INTERVAL', async () => {
    (fetchUiConfig as jest.Mock).mockResolvedValue({
      minimumScheduleInterval: { value: '5m', enforce: false },
    });
    const props = await setup({ ruleTypeId: 'my-rule-type' });

    render(
      <IntlProvider locale="en">
        <QueryClientProvider client={new QueryClient()}>
          <RuleAdd {...props} />
        </QueryClientProvider>
      </IntlProvider>
    );

    expect(await screen.findByTestId('intervalInput')).toHaveValue(5);

    expect(await screen.findByTestId('intervalInputUnit')).toHaveValue('m');
  });

  it('emit an onClose event when the rule is saved', async () => {
    (fetchUiConfig as jest.Mock).mockResolvedValue({
      minimumScheduleInterval: { value: '1m', enforce: false },
    });
    const onClose = jest.fn();
    const rule = mockRule();

    (createRule as jest.MockedFunction<typeof createRule>).mockResolvedValue(rule);

    const props = await setup({
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

    render(
      <IntlProvider locale="en">
        <QueryClientProvider client={new QueryClient()}>
          <RuleAdd {...props} />
        </QueryClientProvider>
      </IntlProvider>
    );

    expect(await screen.findByTestId('saveRuleButton')).toBeInTheDocument();

    await userEvent.click(await screen.findByTestId('saveRuleButton'));

    await waitFor(() => {
      return expect(onClose).toHaveBeenCalledWith(RuleFlyoutCloseReason.SAVED, {
        test: 'some value',
        fields: ['test'],
      });
    });
  });

  it('should set consumer automatically if only 1 authorized consumer exists', async () => {
    (fetchUiConfig as jest.Mock).mockResolvedValue({
      minimumScheduleInterval: { value: '1m', enforce: false },
    });
    const onClose = jest.fn();
    const props = await setup({
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
          category: 'my-category',
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

    render(
      <IntlProvider locale="en">
        <QueryClientProvider client={new QueryClient()}>
          <RuleAdd {...props} />
        </QueryClientProvider>
      </IntlProvider>
    );

    expect(await screen.findByTestId('saveRuleButton')).toBeInTheDocument();

    await waitFor(async () => {
      await userEvent.click(await screen.findByTestId('saveRuleButton'));
      return expect(createRule).toHaveBeenLastCalledWith(
        expect.objectContaining({
          rule: expect.objectContaining({
            consumer: 'logs',
          }),
        })
      );
    });
  });

  it('should enforce any default interval', async () => {
    (fetchUiConfig as jest.Mock).mockResolvedValue({
      minimumScheduleInterval: { value: '1m', enforce: false },
    });
    const props = await setup({
      initialValues: { ruleTypeId: 'my-rule-type' },
      onClose: jest.fn(),
      defaultScheduleInterval: '3h',
      ruleTypeId: 'my-rule-type',
      actionsShow: true,
    });

    render(
      <IntlProvider locale="en">
        <QueryClientProvider client={new QueryClient()}>
          <RuleAdd {...props} />
        </QueryClientProvider>
      </IntlProvider>
    );

    expect(await screen.findByTestId('intervalInputUnit')).toHaveValue('h');

    expect(await screen.findByTestId('intervalInput')).toHaveValue(3);
  });

  it('should load connectors and connector types when there is a pre-selected rule type', async () => {
    (fetchUiConfig as jest.Mock).mockResolvedValue({
      minimumScheduleInterval: { value: '1m', enforce: false },
    });

    const props = await setup({
      initialValues: {},
      onClose: jest.fn(),
      ruleTypeId: 'my-rule-type',
      actionsShow: true,
    });

    render(
      <IntlProvider locale="en">
        <QueryClientProvider client={new QueryClient()}>
          <RuleAdd {...props} />
        </QueryClientProvider>
      </IntlProvider>
    );

    await waitFor(() => {
      expect(fetchUiHealthStatus).toHaveBeenCalledTimes(1);
      expect(fetchAlertingFrameworkHealth).toHaveBeenCalledTimes(1);
      expect(loadActionTypes).toHaveBeenCalledTimes(1);
      expect(loadAllActions).toHaveBeenCalledTimes(1);
    });
  });

  it('should not load connectors and connector types when there is not an encryptionKey', async () => {
    (fetchUiConfig as jest.Mock).mockResolvedValue({
      minimumScheduleInterval: { value: '1m', enforce: false },
    });
    (fetchAlertingFrameworkHealth as jest.Mock).mockResolvedValue({
      isSufficientlySecure: true,
      hasPermanentEncryptionKey: false,
    });

    const props = await setup({
      initialValues: {},
      onClose: jest.fn(),
      ruleTypeId: 'my-rule-type',
      actionsShow: true,
    });

    render(
      <IntlProvider locale="en">
        <QueryClientProvider client={new QueryClient()}>
          <RuleAdd {...props} />
        </QueryClientProvider>
      </IntlProvider>
    );

    await waitFor(() => {
      expect(fetchUiHealthStatus).toHaveBeenCalledTimes(1);
      expect(fetchAlertingFrameworkHealth).toHaveBeenCalledTimes(1);
      expect(loadActionTypes).not.toHaveBeenCalled();
      expect(loadAllActions).not.toHaveBeenCalled();
    });

    expect(
      await screen.findByText('You must configure an encryption key to use Alerting.', {
        collapseWhitespace: false,
      })
    ).toBeInTheDocument();
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
