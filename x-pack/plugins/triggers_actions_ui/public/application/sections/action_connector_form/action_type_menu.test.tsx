/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as React from 'react';
import { mountWithIntl } from '@kbn/test-jest-helpers';
import { coreMock } from '@kbn/core/public/mocks';
import { actionTypeRegistryMock } from '../../action_type_registry.mock';
import { ActionTypeMenu } from './action_type_menu';
import { ConnectorValidationResult, GenericValidationResult } from '../../../types';
import { useKibana } from '../../../common/lib/kibana';
jest.mock('../../../common/lib/kibana');
const actionTypeRegistry = actionTypeRegistryMock.create();
const useKibanaMock = useKibana as jest.Mocked<typeof useKibana>;

describe('connector_add_flyout', () => {
  beforeAll(async () => {
    const mockes = coreMock.createSetup();
    const [
      {
        application: { capabilities },
      },
    ] = await mockes.getStartServices();
    useKibanaMock().services.application.capabilities = {
      ...capabilities,
      actions: {
        show: true,
        save: true,
        delete: true,
      },
    };
  });

  it('renders action type menu with proper EuiCards for registered action types', () => {
    const onActionTypeChange = jest.fn();
    const actionType = actionTypeRegistryMock.createMockActionTypeModel({
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
    actionTypeRegistry.get.mockReturnValueOnce(actionType);

    const wrapper = mountWithIntl(
      <ActionTypeMenu
        onActionTypeChange={onActionTypeChange}
        actionTypes={[
          {
            id: actionType.id,
            enabled: true,
            name: 'Test',
            enabledInConfig: true,
            enabledInLicense: true,
            minimumLicenseRequired: 'basic',
          },
        ]}
        actionTypeRegistry={actionTypeRegistry}
      />
    );

    expect(wrapper.find('[data-test-subj="my-action-type-card"]').exists()).toBeTruthy();
  });

  it(`doesn't renders action types that are disabled via config`, () => {
    const onActionTypeChange = jest.fn();
    const actionType = actionTypeRegistryMock.createMockActionTypeModel({
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
    actionTypeRegistry.get.mockReturnValueOnce(actionType);

    const wrapper = mountWithIntl(
      <ActionTypeMenu
        onActionTypeChange={onActionTypeChange}
        actionTypes={[
          {
            id: actionType.id,
            enabled: false,
            name: 'Test',
            enabledInConfig: false,
            enabledInLicense: true,
            minimumLicenseRequired: 'gold',
          },
        ]}
        actionTypeRegistry={actionTypeRegistry}
      />
    );

    expect(wrapper.find('[data-test-subj="my-action-type-card"]').exists()).toBeFalsy();
  });

  it(`renders action types as disabled when disabled by license`, () => {
    const onActionTypeChange = jest.fn();
    const actionType = actionTypeRegistryMock.createMockActionTypeModel({
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
    actionTypeRegistry.get.mockReturnValueOnce(actionType);

    const wrapper = mountWithIntl(
      <ActionTypeMenu
        onActionTypeChange={onActionTypeChange}
        actionTypes={[
          {
            id: actionType.id,
            enabled: false,
            name: 'Test',
            enabledInConfig: true,
            enabledInLicense: false,
            minimumLicenseRequired: 'gold',
          },
        ]}
        actionTypeRegistry={actionTypeRegistry}
      />
    );

    expect(wrapper.find('EuiToolTip [data-test-subj="my-action-type-card"]').exists()).toBeTruthy();
  });
});
