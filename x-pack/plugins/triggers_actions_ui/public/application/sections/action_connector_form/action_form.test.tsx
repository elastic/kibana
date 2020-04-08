/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { Fragment } from 'react';
import { mountWithIntl, nextTick } from 'test_utils/enzyme_helpers';
import { coreMock } from '../../../../../../../src/core/public/mocks';
import { ReactWrapper } from 'enzyme';
import { act } from 'react-dom/test-utils';
import { actionTypeRegistryMock } from '../../action_type_registry.mock';
import { ValidationResult, Alert, AlertAction } from '../../../types';
import { ActionForm } from './action_form';
jest.mock('../../lib/action_connector_api', () => ({
  loadAllActions: jest.fn(),
  loadActionTypes: jest.fn(),
}));
const actionTypeRegistry = actionTypeRegistryMock.create();
describe('action_form', () => {
  let deps: any;
  const alertType = {
    id: 'my-alert-type',
    iconClass: 'test',
    name: 'test-alert',
    validate: (): ValidationResult => {
      return { errors: {} };
    },
    alertParamsExpression: () => <Fragment />,
  };

  const actionType = {
    id: 'my-action-type',
    iconClass: 'test',
    selectMessage: 'test',
    validateConnector: (): ValidationResult => {
      return { errors: {} };
    },
    validateParams: (): ValidationResult => {
      const validationResult = { errors: {} };
      return validationResult;
    },
    actionConnectorFields: null,
    actionParamsFields: null,
  };

  const disabledByConfigActionType = {
    id: 'disabled-by-config',
    iconClass: 'test',
    selectMessage: 'test',
    validateConnector: (): ValidationResult => {
      return { errors: {} };
    },
    validateParams: (): ValidationResult => {
      const validationResult = { errors: {} };
      return validationResult;
    },
    actionConnectorFields: null,
    actionParamsFields: null,
  };

  const disabledByLicenseActionType = {
    id: 'disabled-by-license',
    iconClass: 'test',
    selectMessage: 'test',
    validateConnector: (): ValidationResult => {
      return { errors: {} };
    },
    validateParams: (): ValidationResult => {
      const validationResult = { errors: {} };
      return validationResult;
    },
    actionConnectorFields: null,
    actionParamsFields: null,
  };

  describe('action_form in alert', () => {
    let wrapper: ReactWrapper<any>;

    async function setup() {
      const { loadAllActions } = jest.requireMock('../../lib/action_connector_api');
      loadAllActions.mockResolvedValueOnce([
        {
          secrets: {},
          id: 'test',
          actionTypeId: actionType.id,
          name: 'Test connector',
          config: {},
          isPreconfigured: false,
        },
      ]);
      const mockes = coreMock.createSetup();
      deps = {
        toastNotifications: mockes.notifications.toasts,
        http: mockes.http,
        actionTypeRegistry: actionTypeRegistry as any,
      };
      actionTypeRegistry.list.mockReturnValue([
        actionType,
        disabledByConfigActionType,
        disabledByLicenseActionType,
      ]);
      actionTypeRegistry.has.mockReturnValue(true);

      const initialAlert = ({
        name: 'test',
        params: {},
        consumer: 'alerting',
        alertTypeId: alertType.id,
        schedule: {
          interval: '1m',
        },
        actions: [
          {
            group: 'default',
            id: 'test',
            actionTypeId: actionType.id,
            params: {
              message: '',
            },
          },
        ],
        tags: [],
        muteAll: false,
        enabled: false,
        mutedInstanceIds: [],
      } as unknown) as Alert;

      wrapper = mountWithIntl(
        <ActionForm
          actions={initialAlert.actions}
          messageVariables={['test var1', 'test var2']}
          defaultActionGroupId={'default'}
          setActionIdByIndex={(id: string, index: number) => {
            initialAlert.actions[index].id = id;
          }}
          setAlertProperty={(_updatedActions: AlertAction[]) => {}}
          setActionParamsProperty={(key: string, value: any, index: number) =>
            (initialAlert.actions[index] = { ...initialAlert.actions[index], [key]: value })
          }
          http={deps!.http}
          actionTypeRegistry={deps!.actionTypeRegistry}
          defaultActionMessage={'Alert [{{ctx.metadata.name}}] has exceeded the threshold'}
          actionTypes={[
            {
              id: actionType.id,
              name: 'Test',
              enabled: true,
              enabledInConfig: true,
              enabledInLicense: true,
              minimumLicenseRequired: 'basic',
            },
            {
              id: '.index',
              name: 'Index',
              enabled: true,
              enabledInConfig: true,
              enabledInLicense: true,
              minimumLicenseRequired: 'basic',
            },
            {
              id: 'disabled-by-config',
              name: 'Disabled by config',
              enabled: false,
              enabledInConfig: false,
              enabledInLicense: true,
              minimumLicenseRequired: 'gold',
            },
            {
              id: 'disabled-by-license',
              name: 'Disabled by license',
              enabled: false,
              enabledInConfig: true,
              enabledInLicense: false,
              minimumLicenseRequired: 'gold',
            },
          ]}
          toastNotifications={deps!.toastNotifications}
        />
      );

      // Wait for active space to resolve before requesting the component to update
      await act(async () => {
        await nextTick();
        wrapper.update();
      });
    }

    it('renders available action cards', async () => {
      await setup();
      const actionOption = wrapper.find(
        `[data-test-subj="${actionType.id}-ActionTypeSelectOption"]`
      );
      expect(actionOption.exists()).toBeTruthy();
      expect(
        wrapper
          .find(`EuiToolTip [data-test-subj="${actionType.id}-ActionTypeSelectOption"]`)
          .exists()
      ).toBeFalsy();
    });

    it(`doesn't render action types disabled by config`, async () => {
      await setup();
      const actionOption = wrapper.find(
        `[data-test-subj="disabled-by-config-ActionTypeSelectOption"]`
      );
      expect(actionOption.exists()).toBeFalsy();
    });

    it('renders action types disabled by license', async () => {
      await setup();
      const actionOption = wrapper.find(
        `[data-test-subj="disabled-by-license-ActionTypeSelectOption"]`
      );
      expect(actionOption.exists()).toBeTruthy();
      expect(
        wrapper
          .find('EuiToolTip [data-test-subj="disabled-by-license-ActionTypeSelectOption"]')
          .exists()
      ).toBeTruthy();
    });
  });
});
