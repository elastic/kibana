/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as React from 'react';
import { mountWithIntl } from '@kbn/test-jest-helpers';
import { coreMock } from '../../../../../../../src/core/public/mocks';
import { actionTypeRegistryMock } from '../../action_type_registry.mock';
import { ConnectorValidationResult, GenericValidationResult } from '../../../types';
import ConnectorEditFlyout from './connector_edit_flyout';
import { useKibana } from '../../../common/lib/kibana';

jest.mock('../../../common/lib/kibana');
const actionTypeRegistry = actionTypeRegistryMock.create();
const useKibanaMock = useKibana as jest.Mocked<typeof useKibana>;

describe('connector_edit_flyout', () => {
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
        save: false,
        delete: false,
      },
    };
  });

  test('if input connector render correct in the edit form', () => {
    const connector = {
      secrets: {},
      id: 'test',
      actionTypeId: 'test-action-type-id',
      actionType: 'test-action-type-name',
      name: 'action-connector',
      isPreconfigured: false,
      referencedByCount: 0,
      config: {},
    };

    const actionType = actionTypeRegistryMock.createMockActionTypeModel({
      id: 'test-action-type-id',
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
    actionTypeRegistry.get.mockReturnValue(actionType);
    actionTypeRegistry.has.mockReturnValue(true);
    useKibanaMock().services.actionTypeRegistry = actionTypeRegistry;
    const wrapper = mountWithIntl(
      <ConnectorEditFlyout
        initialConnector={connector}
        onClose={() => {}}
        reloadConnectors={() => {
          return new Promise<void>(() => {});
        }}
        actionTypeRegistry={actionTypeRegistry}
      />
    );

    const connectorNameField = wrapper.find('[data-test-subj="nameInput"]');
    expect(connectorNameField.exists()).toBeTruthy();
    expect(connectorNameField.first().prop('value')).toBe('action-connector');
  });

  test('if preconfigured connector rendered correct in the edit form', () => {
    const connector = {
      secrets: {},
      id: 'test',
      actionTypeId: 'test-action-type-id',
      actionType: 'test-action-type-name',
      name: 'preconfigured-connector',
      isPreconfigured: true,
      referencedByCount: 0,
      config: {},
    };

    const actionType = actionTypeRegistryMock.createMockActionTypeModel({
      id: 'test-action-type-id',
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
    actionTypeRegistry.get.mockReturnValue(actionType);
    actionTypeRegistry.has.mockReturnValue(true);
    useKibanaMock().services.actionTypeRegistry = actionTypeRegistry;

    const wrapper = mountWithIntl(
      <ConnectorEditFlyout
        initialConnector={connector}
        onClose={() => {}}
        reloadConnectors={() => {
          return new Promise<void>(() => {});
        }}
        actionTypeRegistry={actionTypeRegistry}
      />
    );

    const preconfiguredBadge = wrapper.find('[data-test-subj="preconfiguredBadge"]');
    expect(preconfiguredBadge.exists()).toBeTruthy();
    expect(wrapper.find('[data-test-subj="saveAndCloseEditedActionButton"]').exists()).toBeFalsy();
  });
});
