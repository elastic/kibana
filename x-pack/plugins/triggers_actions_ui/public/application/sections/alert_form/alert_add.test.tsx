/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import * as React from 'react';
import { mountWithIntl, nextTick } from '@kbn/test/jest';
import { act } from 'react-dom/test-utils';
import { FormattedMessage } from '@kbn/i18n/react';
import { EuiFormLabel } from '@elastic/eui';
import { coreMock } from '../../../../../../../src/core/public/mocks';
import AlertAdd from './alert_add';
import { actionTypeRegistryMock } from '../../action_type_registry.mock';
import {
  Alert,
  ConnectorValidationResult,
  GenericValidationResult,
  ValidationResult,
} from '../../../types';
import { alertTypeRegistryMock } from '../../alert_type_registry.mock';
import { ReactWrapper } from 'enzyme';
import { ALERTS_FEATURE_ID } from '../../../../../alerts/common';
import { useKibana } from '../../../common/lib/kibana';
jest.mock('../../../common/lib/kibana');

jest.mock('../../lib/alert_api', () => ({
  loadAlertTypes: jest.fn(),
  health: jest.fn(() => ({ isSufficientlySecure: true, hasPermanentEncryptionKey: true })),
}));

const actionTypeRegistry = actionTypeRegistryMock.create();
const alertTypeRegistry = alertTypeRegistryMock.create();
const useKibanaMock = useKibana as jest.Mocked<typeof useKibana>;

export const TestExpression: React.FunctionComponent<any> = () => {
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

  async function setup(initialValues?: Partial<Alert>) {
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
      validateConnector: (): ConnectorValidationResult<unknown, unknown> => {
        return {};
      },
      validateParams: (): GenericValidationResult<unknown> => {
        const validationResult = { errors: {} };
        return validationResult;
      },
      actionConnectorFields: null,
    });
    actionTypeRegistry.get.mockReturnValueOnce(actionTypeModel);
    actionTypeRegistry.has.mockReturnValue(true);
    alertTypeRegistry.list.mockReturnValue([alertType]);
    alertTypeRegistry.get.mockReturnValue(alertType);
    alertTypeRegistry.has.mockReturnValue(true);
    actionTypeRegistry.list.mockReturnValue([actionTypeModel]);
    actionTypeRegistry.has.mockReturnValue(true);

    wrapper = mountWithIntl(
      <AlertAdd
        consumer={ALERTS_FEATURE_ID}
        onClose={() => {}}
        initialValues={initialValues}
        reloadAlerts={() => {
          return new Promise<void>(() => {});
        }}
        actionTypeRegistry={actionTypeRegistry}
        alertTypeRegistry={alertTypeRegistry}
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
    await setup();

    await new Promise((resolve) => {
      setTimeout(resolve, 1000);
    });

    expect(wrapper.find('[data-test-subj="addAlertFlyoutTitle"]').exists()).toBeTruthy();
    expect(wrapper.find('[data-test-subj="saveAlertButton"]').exists()).toBeTruthy();

    wrapper.find('[data-test-subj="my-alert-type-SelectOption"]').first().simulate('click');

    expect(wrapper.find('input#alertName').props().value).toBe('');

    expect(wrapper.find('[data-test-subj="tagsComboBox"]').first().text()).toBe('');

    expect(wrapper.find('.euiSelect').first().props().value).toBe('m');
  });

  it('renders alert add flyout with initial values', async () => {
    await setup({
      name: 'Simple status alert',
      tags: ['uptime', 'logs'],
      schedule: {
        interval: '1h',
      },
    });

    await new Promise((resolve) => {
      setTimeout(resolve, 1000);
    });

    expect(wrapper.find('input#alertName').props().value).toBe('Simple status alert');

    expect(wrapper.find('[data-test-subj="tagsComboBox"]').first().text()).toBe('uptimelogs');

    expect(wrapper.find('.euiSelect').first().props().value).toBe('h');
  });
});
