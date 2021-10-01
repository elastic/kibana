/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import uuid from 'uuid';
import React, { FunctionComponent } from 'react';
import { mountWithIntl, nextTick } from '@kbn/test/jest';
import { act } from 'react-dom/test-utils';
import { FormattedMessage } from '@kbn/i18n/react';
import { EuiFormLabel } from '@elastic/eui';
import { coreMock } from '../../../../../../../src/core/public/mocks';
import AlertAdd from './alert_add';
import { createAlert } from '../../lib/alert_api';
import { actionTypeRegistryMock } from '../../action_type_registry.mock';
import {
  Alert,
  AlertAddProps,
  AlertFlyoutCloseReason,
  ConnectorValidationResult,
  GenericValidationResult,
  ValidationResult,
} from '../../../types';
import { ruleTypeRegistryMock } from '../../rule_type_registry.mock';
import { ReactWrapper } from 'enzyme';
import { ALERTS_FEATURE_ID } from '../../../../../alerting/common';
import { useKibana } from '../../../common/lib/kibana';

jest.mock('../../../common/lib/kibana');

jest.mock('../../lib/alert_api', () => ({
  loadAlertTypes: jest.fn(),
  createAlert: jest.fn(),
  alertingFrameworkHealth: jest.fn(() => ({
    isSufficientlySecure: true,
    hasPermanentEncryptionKey: true,
  })),
}));

jest.mock('../../../common/lib/health_api', () => ({
  triggersActionsUiHealth: jest.fn(() => ({ isAlertsAvailable: true })),
}));

const actionTypeRegistry = actionTypeRegistryMock.create();
const ruleTypeRegistry = ruleTypeRegistryMock.create();
const useKibanaMock = useKibana as jest.Mocked<typeof useKibana>;

const delay = (wait: number = 1000) =>
  new Promise((resolve) => {
    setTimeout(resolve, wait);
  });

export const TestExpression: FunctionComponent<any> = () => {
  return (
    <EuiFormLabel>
      <FormattedMessage
        defaultMessage="Metadata: {val}. Fields: {fields}."
        id="xpack.triggersActionsUI.sections.alertAdd.metadataTest"
        values={{ val: 'test', fields: '' }}
      />
    </EuiFormLabel>
  );
};

describe('alert_add', () => {
  let wrapper: ReactWrapper<any>;

  async function setup(
    initialValues?: Partial<Alert>,
    onClose: AlertAddProps['onClose'] = jest.fn()
  ) {
    const mocks = coreMock.createSetup();
    const { loadAlertTypes } = jest.requireMock('../../lib/alert_api');
    const alertTypes = [
      {
        id: 'my-alert-type',
        name: 'Test',
        actionGroups: [
          {
            id: 'testActionGroup',
            name: 'Test Action Group',
          },
        ],
        defaultActionGroupId: 'testActionGroup',
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
    loadAlertTypes.mockResolvedValue(alertTypes);
    const [
      {
        application: { capabilities },
      },
    ] = await mocks.getStartServices();
    // eslint-disable-next-line react-hooks/rules-of-hooks
    useKibanaMock().services.application.capabilities = {
      ...capabilities,
      alerts: {
        show: true,
        save: true,
        delete: true,
      },
    };

    mocks.http.get.mockResolvedValue({
      isSufficientlySecure: true,
      hasPermanentEncryptionKey: true,
    });

    const alertType = {
      id: 'my-alert-type',
      iconClass: 'test',
      description: 'test',
      documentationUrl: null,
      validate: (): ValidationResult => {
        return { errors: {} };
      },
      alertParamsExpression: TestExpression,
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
    ruleTypeRegistry.list.mockReturnValue([alertType]);
    ruleTypeRegistry.get.mockReturnValue(alertType);
    ruleTypeRegistry.has.mockReturnValue(true);
    actionTypeRegistry.list.mockReturnValue([actionTypeModel]);
    actionTypeRegistry.has.mockReturnValue(true);

    wrapper = mountWithIntl(
      <AlertAdd
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

  it('renders alert add flyout', async () => {
    const onClose = jest.fn();
    await setup({}, onClose);
    await delay(1000);

    expect(wrapper.find('[data-test-subj="addAlertFlyoutTitle"]').exists()).toBeTruthy();
    expect(wrapper.find('[data-test-subj="saveAlertButton"]').exists()).toBeTruthy();

    wrapper.find('[data-test-subj="my-alert-type-SelectOption"]').first().simulate('click');

    expect(wrapper.find('input#alertName').props().value).toBe('');

    expect(wrapper.find('[data-test-subj="tagsComboBox"]').first().text()).toBe('');

    expect(wrapper.find('.euiSelect').first().props().value).toBe('m');

    wrapper.find('[data-test-subj="cancelSaveAlertButton"]').first().simulate('click');
    expect(onClose).toHaveBeenCalledWith(AlertFlyoutCloseReason.CANCELED);
  });

  it('renders alert add flyout with initial values', async () => {
    const onClose = jest.fn();
    await setup(
      {
        name: 'Simple status alert',
        tags: ['uptime', 'logs'],
        schedule: {
          interval: '1h',
        },
      },
      onClose
    );

    await delay(1000);

    expect(wrapper.find('input#alertName').props().value).toBe('Simple status alert');

    expect(wrapper.find('[data-test-subj="tagsComboBox"]').first().text()).toBe('uptimelogs');

    expect(wrapper.find('.euiSelect').first().props().value).toBe('h');
  });

  it('emit an onClose event when the alert is saved', async () => {
    const onClose = jest.fn();
    const alert = mockAlert();

    (createAlert as jest.MockedFunction<typeof createAlert>).mockResolvedValue(alert);

    await setup(
      {
        name: 'Simple status alert',
        alertTypeId: 'my-alert-type',
        tags: ['uptime', 'logs'],
        schedule: {
          interval: '1h',
        },
      },
      onClose
    );

    wrapper.find('[data-test-subj="saveAlertButton"]').first().simulate('click');

    // Wait for handlers to fire
    await act(async () => {
      await nextTick();
      wrapper.update();
    });

    expect(onClose).toHaveBeenCalledWith(AlertFlyoutCloseReason.SAVED);
  });
});

function mockAlert(overloads: Partial<Alert> = {}): Alert {
  return {
    id: uuid.v4(),
    enabled: true,
    name: `alert-${uuid.v4()}`,
    tags: [],
    alertTypeId: '.noop',
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
