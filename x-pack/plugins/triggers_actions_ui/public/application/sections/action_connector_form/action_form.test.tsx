/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { Fragment, lazy } from 'react';
import { mountWithIntl, nextTick } from 'test_utils/enzyme_helpers';
import { coreMock } from '../../../../../../../src/core/public/mocks';
import { ReactWrapper } from 'enzyme';
import { act } from 'react-dom/test-utils';
import { actionTypeRegistryMock } from '../../action_type_registry.mock';
import { ValidationResult, Alert, AlertAction } from '../../../types';
import ActionForm from './action_form';
jest.mock('../../lib/action_connector_api', () => ({
  loadAllActions: jest.fn(),
  loadActionTypes: jest.fn(),
}));
const actionTypeRegistry = actionTypeRegistryMock.create();
describe('action_form', () => {
  let deps: any;

  const mockedActionParamsFields = lazy(async () => ({
    default() {
      return <Fragment />;
    },
  }));

  const alertType = {
    id: 'my-alert-type',
    iconClass: 'test',
    name: 'test-alert',
    validate: (): ValidationResult => {
      return { errors: {} };
    },
    alertParamsExpression: () => <Fragment />,
    requiresAppContext: false,
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
    actionParamsFields: mockedActionParamsFields,
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
    actionParamsFields: mockedActionParamsFields,
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
    actionParamsFields: mockedActionParamsFields,
  };

  const preconfiguredOnly = {
    id: 'preconfigured',
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
    actionParamsFields: mockedActionParamsFields,
  };

  const actionTypeWithoutParams = {
    id: 'my-action-type-without-params',
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
        {
          secrets: {},
          id: 'test2',
          actionTypeId: actionType.id,
          name: 'Test connector 2',
          config: {},
          isPreconfigured: true,
        },
        {
          secrets: {},
          id: 'test3',
          actionTypeId: preconfiguredOnly.id,
          name: 'Preconfigured Only',
          config: {},
          isPreconfigured: true,
        },
        {
          secrets: {},
          id: 'test4',
          actionTypeId: preconfiguredOnly.id,
          name: 'Regular connector',
          config: {},
          isPreconfigured: false,
        },
        {
          secrets: {},
          id: '.servicenow',
          actionTypeId: '.servicenow',
          name: 'Non consumer connector',
          config: {
            isCaseOwned: true,
          },
          isPreconfigured: false,
        },
      ]);
      const mocks = coreMock.createSetup();
      const [
        {
          application: { capabilities },
        },
      ] = await mocks.getStartServices();
      deps = {
        toastNotifications: mocks.notifications.toasts,
        http: mocks.http,
        capabilities: {
          ...capabilities,
          actions: {
            delete: true,
            save: true,
            show: true,
          },
        },
        actionTypeRegistry: actionTypeRegistry as any,
        docLinks: { ELASTIC_WEBSITE_URL: '', DOC_LINK_VERSION: '' },
      };
      actionTypeRegistry.list.mockReturnValue([
        actionType,
        disabledByConfigActionType,
        disabledByLicenseActionType,
        preconfiguredOnly,
        actionTypeWithoutParams,
      ]);
      actionTypeRegistry.has.mockReturnValue(true);
      actionTypeRegistry.get.mockReturnValue(actionType);

      const initialAlert = ({
        name: 'test',
        params: {},
        consumer: 'alerts',
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
              id: 'preconfigured',
              name: 'Preconfigured only',
              enabled: true,
              enabledInConfig: false,
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
            {
              id: actionTypeWithoutParams.id,
              name: 'Action type without params',
              enabled: true,
              enabledInConfig: true,
              enabledInLicense: true,
              minimumLicenseRequired: 'basic',
            },
          ]}
          toastNotifications={deps!.toastNotifications}
          docLinks={deps.docLinks}
          capabilities={deps.capabilities}
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

    it('does not render action types disabled by config', async () => {
      await setup();
      const actionOption = wrapper.find(
        '[data-test-subj="disabled-by-config-ActionTypeSelectOption"]'
      );
      expect(actionOption.exists()).toBeFalsy();
    });

    it('render action types which is preconfigured only (disabled by config and with preconfigured connectors)', async () => {
      await setup();
      const actionOption = wrapper.find('[data-test-subj="preconfigured-ActionTypeSelectOption"]');
      expect(actionOption.exists()).toBeTruthy();
    });

    it('renders available connectors for the selected action type', async () => {
      await setup();
      const actionOption = wrapper.find(
        `[data-test-subj="${actionType.id}-ActionTypeSelectOption"]`
      );
      actionOption.first().simulate('click');
      const combobox = wrapper.find(`[data-test-subj="selectActionConnector-${actionType.id}"]`);
      expect((combobox.first().props() as any).options).toMatchInlineSnapshot(`
      Array [
        Object {
          "id": "test",
          "key": "test",
          "label": "Test connector ",
        },
        Object {
          "id": "test2",
          "key": "test2",
          "label": "Test connector 2 (preconfigured)",
        },
      ]
      `);
    });

    it('renders only preconfigured connectors for the selected preconfigured action type', async () => {
      await setup();
      const actionOption = wrapper.find('[data-test-subj="preconfigured-ActionTypeSelectOption"]');
      actionOption.first().simulate('click');
      const combobox = wrapper.find('[data-test-subj="selectActionConnector-preconfigured"]');
      expect((combobox.first().props() as any).options).toMatchInlineSnapshot(`
      Array [
        Object {
          "id": "test3",
          "key": "test3",
          "label": "Preconfigured Only (preconfigured)",
        },
      ]
      `);
    });

    it('does not render "Add new" button for preconfigured only action type', async () => {
      await setup();
      const actionOption = wrapper.find('[data-test-subj="preconfigured-ActionTypeSelectOption"]');
      actionOption.first().simulate('click');
      const preconfigPannel = wrapper.find('[data-test-subj="alertActionAccordion-default"]');
      const addNewConnectorButton = preconfigPannel.find(
        '[data-test-subj="addNewActionConnectorButton-preconfigured"]'
      );
      expect(addNewConnectorButton.exists()).toBeFalsy();
    });

    it('renders action types disabled by license', async () => {
      await setup();
      const actionOption = wrapper.find(
        '[data-test-subj="disabled-by-license-ActionTypeSelectOption"]'
      );
      expect(actionOption.exists()).toBeTruthy();
      expect(
        wrapper
          .find('EuiToolTip [data-test-subj="disabled-by-license-ActionTypeSelectOption"]')
          .exists()
      ).toBeTruthy();
    });

    it(`shouldn't render action types without params component`, async () => {
      await setup();
      const actionOption = wrapper.find(
        `[data-test-subj="${actionTypeWithoutParams.id}-ActionTypeSelectOption"]`
      );
      expect(actionOption.exists()).toBeFalsy();
    });
  });
});
