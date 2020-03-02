/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { Fragment } from 'react';
import { mountWithIntl } from 'test_utils/enzyme_helpers';
import fetchMock from 'fetch-mock';
import { coreMock } from '../../../../../../../src/core/public/mocks';
import { ReactWrapper } from 'enzyme';
import { act } from 'react-dom/test-utils';
import { actionTypeRegistryMock } from '../../action_type_registry.mock';
import { alertTypeRegistryMock } from '../../alert_type_registry.mock';
import { chartPluginMock } from '../../../../../../../src/plugins/charts/public/mocks';
import { dataPluginMock } from '../../../../../../../src/plugins/data/public/mocks';
import { ValidationResult, Alert, AlertAction } from '../../../types';
import { ActionForm } from './action_form';
import { AppDeps } from '../../app';
import { BASE_ACTION_API_PATH } from '../../constants';
const actionTypeRegistry = actionTypeRegistryMock.create();
const alertTypeRegistry = alertTypeRegistryMock.create();
describe('action_form', () => {
  afterAll(() => {
    fetchMock.restore();
  });

  let deps: AppDeps | null;
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
  beforeAll(async () => {
    const mockes = coreMock.createSetup();
    const [
      {
        chrome,
        docLinks,
        application: { capabilities },
      },
    ] = await mockes.getStartServices();
    deps = {
      chrome,
      docLinks,
      toastNotifications: mockes.notifications.toasts,
      injectedMetadata: mockes.injectedMetadata,
      http: mockes.http,
      uiSettings: mockes.uiSettings,
      dataPlugin: dataPluginMock.createStartContract(),
      charts: chartPluginMock.createStartContract(),
      capabilities: {
        ...capabilities,
        siem: {
          'alerting:show': true,
          'alerting:save': true,
          'alerting:delete': false,
        },
      },
      setBreadcrumbs: jest.fn(),
      actionTypeRegistry: actionTypeRegistry as any,
      alertTypeRegistry: alertTypeRegistry as any,
    };
  });

  describe('action_form in alert', () => {
    let wrapper: ReactWrapper<any>;

    beforeAll(async () => {
      alertTypeRegistry.list.mockReturnValue([alertType]);
      alertTypeRegistry.has.mockReturnValue(true);
      actionTypeRegistry.list.mockReturnValue([actionType]);
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

      fetchMock.mock(`${BASE_ACTION_API_PATH}/_find`, {
        returnedData: {
          page: 1,
          perPage: 10,
          total: 1,
          data: {
            secrets: {},
            id: 'test',
            actionTypeId: actionType.id,
            name: 'Test',
            config: {},
          },
        },
      });

      await act(async () => {
        if (deps) {
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
              http={deps.http}
              actionTypeRegistry={deps.actionTypeRegistry}
              defaultActionMessage={'Alert [{{ctx.metadata.name}}] has exceeded the threshold'}
              actionTypes={[
                { id: actionType.id, name: 'Test', enabled: true },
                { id: '.index', name: 'Index', enabled: true },
              ]}
            />
          );
        }
      });

      await waitForRender(wrapper);
    });

    it('renders available action cards', () => {
      const actionOption = wrapper.find(
        `[data-test-subj="${actionType.id}-ActionTypeSelectOption"]`
      );
      expect(actionOption.exists()).toBeTruthy();
    });
  });

  async function waitForRender(wrapper: ReactWrapper<any, any>) {
    await Promise.resolve();
    await Promise.resolve();
    wrapper.update();
  }
});
