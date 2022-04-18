/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as React from 'react';
import { mountWithIntl } from '@kbn/test-jest-helpers';
import { coreMock } from '@kbn/core/public/mocks';
import ConnectorAddFlyout from './connector_add_flyout';
import { actionTypeRegistryMock } from '../../action_type_registry.mock';
import { ConnectorValidationResult, GenericValidationResult } from '../../../types';
import { useKibana } from '../../../common/lib/kibana';
jest.mock('../../../common/lib/kibana');

const actionTypeRegistry = actionTypeRegistryMock.create();
const useKibanaMock = useKibana as jest.Mocked<typeof useKibana>;

describe('connector_add_flyout', () => {
  beforeAll(async () => {
    const mocks = coreMock.createSetup();
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

  it('renders action type menu on flyout open', () => {
    const actionType = createActionType();
    actionTypeRegistry.get.mockReturnValueOnce(actionType);
    actionTypeRegistry.has.mockReturnValue(true);

    const wrapper = mountWithIntl(
      <ConnectorAddFlyout
        onClose={() => {}}
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
        reloadConnectors={() => {
          return new Promise<void>(() => {});
        }}
        actionTypeRegistry={actionTypeRegistry}
      />
    );
    expect(wrapper.find('ActionTypeMenu')).toHaveLength(1);
    expect(wrapper.find(`[data-test-subj="${actionType.id}-card"]`).exists()).toBeTruthy();
    expect(wrapper.find('[data-test-subj="cancelButton"]').exists()).toBeTruthy();
    expect(wrapper.find('[data-test-subj="backButton"]').exists()).toBeFalsy();
  });

  it('renders banner with subscription links when gold features are disabled due to licensing ', () => {
    const actionType = createActionType();
    const disabledActionType = createActionType();

    actionTypeRegistry.get.mockReturnValueOnce(actionType);
    actionTypeRegistry.has.mockReturnValue(true);

    const wrapper = mountWithIntl(
      <ConnectorAddFlyout
        onClose={() => {}}
        actionTypes={[
          {
            id: actionType.id,
            enabled: true,
            name: 'Test',
            enabledInConfig: true,
            enabledInLicense: true,
            minimumLicenseRequired: 'basic',
          },
          {
            id: disabledActionType.id,
            enabled: true,
            name: 'Test',
            enabledInConfig: true,
            enabledInLicense: false,
            minimumLicenseRequired: 'gold',
          },
        ]}
        reloadConnectors={() => {
          return new Promise<void>(() => {});
        }}
        actionTypeRegistry={actionTypeRegistry}
      />
    );
    const callout = wrapper.find('UpgradeYourLicenseCallOut');
    expect(callout).toHaveLength(1);

    const manageLink = callout.find('EuiButton');
    expect(manageLink).toHaveLength(1);
    expect(manageLink.getElements()[0].props.href).toMatchInlineSnapshot(
      `"/app/management/stack/license_management"`
    );

    const subscriptionLink = callout.find('EuiButtonEmpty');
    expect(subscriptionLink).toHaveLength(1);
    expect(subscriptionLink.getElements()[0].props.href).toMatchInlineSnapshot(
      `"https://www.elastic.co/subscriptions"`
    );
  });

  it('does not render banner with subscription links when only platinum features are disabled due to licensing ', () => {
    const actionType = createActionType();
    const disabledActionType = createActionType();

    actionTypeRegistry.get.mockReturnValueOnce(actionType);
    actionTypeRegistry.has.mockReturnValue(true);

    const wrapper = mountWithIntl(
      <ConnectorAddFlyout
        onClose={() => {}}
        actionTypes={[
          {
            id: actionType.id,
            enabled: true,
            name: 'Test',
            enabledInConfig: true,
            enabledInLicense: true,
            minimumLicenseRequired: 'basic',
          },
          {
            id: disabledActionType.id,
            enabled: true,
            name: 'Test',
            enabledInConfig: true,
            enabledInLicense: false,
            minimumLicenseRequired: 'platinum',
          },
        ]}
        reloadConnectors={() => {
          return new Promise<void>(() => {});
        }}
        actionTypeRegistry={actionTypeRegistry}
      />
    );
    const callout = wrapper.find('UpgradeYourLicenseCallOut');
    expect(callout).toHaveLength(0);
  });

  it('does not render banner with subscription links when only enterprise features are disabled due to licensing ', () => {
    const actionType = createActionType();
    const disabledActionType = createActionType();

    actionTypeRegistry.get.mockReturnValueOnce(actionType);
    actionTypeRegistry.has.mockReturnValue(true);

    const wrapper = mountWithIntl(
      <ConnectorAddFlyout
        onClose={() => {}}
        actionTypes={[
          {
            id: actionType.id,
            enabled: true,
            name: 'Test',
            enabledInConfig: true,
            enabledInLicense: true,
            minimumLicenseRequired: 'basic',
          },
          {
            id: disabledActionType.id,
            enabled: true,
            name: 'Test',
            enabledInConfig: true,
            enabledInLicense: false,
            minimumLicenseRequired: 'enterprise',
          },
        ]}
        reloadConnectors={() => {
          return new Promise<void>(() => {});
        }}
        actionTypeRegistry={actionTypeRegistry}
      />
    );
    const callout = wrapper.find('UpgradeYourLicenseCallOut');
    expect(callout).toHaveLength(0);
  });
});

let count = 0;
function createActionType() {
  return actionTypeRegistryMock.createMockActionTypeModel({
    id: `my-action-type-${++count}`,
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
}
