/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import * as React from 'react';
import { mountWithIntl } from '@kbn/test/jest';
import { ConnectorAddModal } from './connector_add_modal';
import { actionTypeRegistryMock } from '../../action_type_registry.mock';
import { ActionType, ConnectorValidationResult, GenericValidationResult } from '../../../types';
import { useKibana } from '../../../common/lib/kibana';
import { coreMock } from '../../../../../../../src/core/public/mocks';

jest.mock('../../../common/lib/kibana');
const mocks = coreMock.createSetup();
const actionTypeRegistry = actionTypeRegistryMock.create();
const useKibanaMock = useKibana as jest.Mocked<typeof useKibana>;

describe('connector_add_modal', () => {
  beforeAll(async () => {
    const [
      {
        application: { capabilities },
      },
    ] = await mocks.getStartServices();
    useKibanaMock().services.application.capabilities = {
      ...capabilities,
      actions: {
        show: true,
        save: true,
        delete: true,
      },
    };
  });
  it('renders connector modal form if addModalVisible is true', () => {
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
        actionTypeRegistry={actionTypeRegistry}
      />
    );
    expect(wrapper.exists('.euiModalHeader')).toBeTruthy();
    expect(wrapper.exists('[data-test-subj="saveActionButtonModal"]')).toBeTruthy();
  });
});
