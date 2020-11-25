/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import * as React from 'react';
import { mountWithIntl } from '@kbn/test/jest';
import { coreMock } from '../../../../../../../src/core/public/mocks';
import { ConnectorAddModal } from './connector_add_modal';
import { actionTypeRegistryMock } from '../../action_type_registry.mock';
import { ValidationResult, ActionType } from '../../../types';
const actionTypeRegistry = actionTypeRegistryMock.create();

describe('connector_add_modal', () => {
  let deps: any;

  beforeAll(async () => {
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
          show: true,
          save: true,
          delete: true,
        },
      },
      actionTypeRegistry,
      docLinks: { ELASTIC_WEBSITE_URL: '', DOC_LINK_VERSION: '' },
    };
  });
  it('renders connector modal form if addModalVisible is true', () => {
    const actionTypeModel = {
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
    actionTypeRegistry.get.mockReturnValueOnce(actionTypeModel);
    actionTypeRegistry.has.mockReturnValue(true);

    const actionType: ActionType = {
      id: 'my-action-type',
      name: 'test',
      enabled: true,
      enabledInConfig: true,
      enabledInLicense: true,
      minimumLicenseRequired: 'basic',
    };

    const wrapper = mountWithIntl(
      <ConnectorAddModal
        onClose={() => {}}
        actionType={actionType}
        http={deps!.http}
        actionTypeRegistry={deps!.actionTypeRegistry}
        toastNotifications={deps!.toastNotifications}
        docLinks={deps!.docLinks}
        capabilities={deps!.capabilities}
      />
    );
    expect(wrapper.exists('.euiModalHeader')).toBeTruthy();
    expect(wrapper.exists('[data-test-subj="saveActionButtonModal"]')).toBeTruthy();
  });
});
