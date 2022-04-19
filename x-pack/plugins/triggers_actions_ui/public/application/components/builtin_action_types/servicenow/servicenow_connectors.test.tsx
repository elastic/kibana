/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act } from '@testing-library/react';
import { mountWithIntl } from '@kbn/test-jest-helpers';

import { useKibana } from '../../../../common/lib/kibana';
import { ActionConnectorFieldsSetCallbacks } from '../../../../types';
import { updateActionConnector } from '../../../lib/action_connector_api';
import ServiceNowConnectorFields from './servicenow_connectors';
import { ServiceNowActionConnector } from './types';
import { getAppInfo } from './api';

jest.mock('../../../../common/lib/kibana');
jest.mock('../../../lib/action_connector_api');
jest.mock('./api');

const useKibanaMock = useKibana as jest.Mocked<typeof useKibana>;
const getAppInfoMock = getAppInfo as jest.Mock;
const updateActionConnectorMock = updateActionConnector as jest.Mock;

describe('ServiceNowActionConnectorFields renders', () => {
  const usesTableApiConnector = {
    secrets: {
      username: 'user',
      password: 'pass',
    },
    id: 'test',
    actionTypeId: '.servicenow',
    isPreconfigured: false,
    isDeprecated: true,
    name: 'SN',
    config: {
      apiUrl: 'https://test/',
      usesTableApi: true,
    },
  } as ServiceNowActionConnector;

  const usesImportSetApiConnector = {
    ...usesTableApiConnector,
    isDeprecated: false,
    config: {
      ...usesTableApiConnector.config,
      usesTableApi: false,
    },
  } as ServiceNowActionConnector;

  test('alerting servicenow connector fields are rendered', () => {
    const wrapper = mountWithIntl(
      <ServiceNowConnectorFields
        action={usesTableApiConnector}
        errors={{ apiUrl: [], username: [], password: [] }}
        editActionConfig={() => {}}
        editActionSecrets={() => {}}
        readOnly={false}
        setCallbacks={() => {}}
        isEdit={false}
      />
    );
    expect(
      wrapper.find('[data-test-subj="connector-servicenow-username-form-input"]').length > 0
    ).toBeTruthy();

    expect(wrapper.find('[data-test-subj="credentialsApiUrlFromInput"]').length > 0).toBeTruthy();
    expect(
      wrapper.find('[data-test-subj="connector-servicenow-password-form-input"]').length > 0
    ).toBeTruthy();
  });

  test('case specific servicenow connector fields is rendered', () => {
    const wrapper = mountWithIntl(
      <ServiceNowConnectorFields
        action={usesImportSetApiConnector}
        errors={{ apiUrl: [], username: [], password: [] }}
        editActionConfig={() => {}}
        editActionSecrets={() => {}}
        readOnly={false}
        consumer={'case'}
        setCallbacks={() => {}}
        isEdit={false}
      />
    );

    expect(wrapper.find('[data-test-subj="credentialsApiUrlFromInput"]').length > 0).toBeTruthy();
    expect(
      wrapper.find('[data-test-subj="connector-servicenow-password-form-input"]').length > 0
    ).toBeTruthy();
  });

  test('should display a message on create to remember credentials', () => {
    const actionConnector = {
      actionTypeId: '.servicenow',
      isPreconfigured: false,
      config: {},
      secrets: {},
    } as ServiceNowActionConnector;

    const wrapper = mountWithIntl(
      <ServiceNowConnectorFields
        action={actionConnector}
        errors={{ apiUrl: [], username: [], password: [] }}
        editActionConfig={() => {}}
        editActionSecrets={() => {}}
        readOnly={false}
        setCallbacks={() => {}}
        isEdit={false}
      />
    );
    expect(wrapper.find('[data-test-subj="rememberValuesMessage"]').length).toBeGreaterThan(0);
    expect(wrapper.find('[data-test-subj="reenterValuesMessage"]').length).toEqual(0);
  });

  test('should display a message for missing secrets after import', () => {
    const actionConnector = {
      actionTypeId: '.servicenow',
      isPreconfigured: false,
      isMissingSecrets: true,
      config: {},
      secrets: {},
    } as ServiceNowActionConnector;

    const wrapper = mountWithIntl(
      <ServiceNowConnectorFields
        action={actionConnector}
        errors={{ apiUrl: [], username: [], password: [] }}
        editActionConfig={() => {}}
        editActionSecrets={() => {}}
        readOnly={false}
        setCallbacks={() => {}}
        isEdit={false}
      />
    );
    expect(wrapper.find('[data-test-subj="missingSecretsMessage"]').length).toBeGreaterThan(0);
  });

  test('should display a message on edit to re-enter credentials', () => {
    const wrapper = mountWithIntl(
      <ServiceNowConnectorFields
        action={usesTableApiConnector}
        errors={{ apiUrl: [], username: [], password: [] }}
        editActionConfig={() => {}}
        editActionSecrets={() => {}}
        readOnly={false}
        setCallbacks={() => {}}
        isEdit={false}
      />
    );
    expect(wrapper.find('[data-test-subj="reenterValuesMessage"]').length).toBeGreaterThan(0);
    expect(wrapper.find('[data-test-subj="rememberValuesMessage"]').length).toEqual(0);
  });

  describe('Elastic certified ServiceNow application', () => {
    const { services } = useKibanaMock();
    const applicationInfoData = {
      name: 'Elastic',
      scope: 'x_elas2_inc_int',
      version: '1.0.0',
    };

    let beforeActionConnectorSaveFn: () => Promise<void>;
    const setCallbacks = (({
      beforeActionConnectorSave,
    }: {
      beforeActionConnectorSave: () => Promise<void>;
    }) => {
      beforeActionConnectorSaveFn = beforeActionConnectorSave;
    }) as ActionConnectorFieldsSetCallbacks;

    beforeEach(() => {
      jest.clearAllMocks();
    });

    test('should render the correct callouts when the connectors needs the application', () => {
      const wrapper = mountWithIntl(
        <ServiceNowConnectorFields
          action={usesImportSetApiConnector}
          errors={{ apiUrl: [], username: [], password: [] }}
          editActionConfig={() => {}}
          editActionSecrets={() => {}}
          readOnly={false}
          setCallbacks={() => {}}
          isEdit={false}
        />
      );
      expect(wrapper.find('[data-test-subj="snInstallationCallout"]').exists()).toBeTruthy();
      expect(wrapper.find('[data-test-subj="snDeprecatedCallout"]').exists()).toBeFalsy();
      expect(wrapper.find('[data-test-subj="snApplicationCallout"]').exists()).toBeFalsy();
    });

    test('should render the correct callouts if the connector uses the table API', () => {
      const wrapper = mountWithIntl(
        <ServiceNowConnectorFields
          action={usesTableApiConnector}
          errors={{ apiUrl: [], username: [], password: [] }}
          editActionConfig={() => {}}
          editActionSecrets={() => {}}
          readOnly={false}
          setCallbacks={() => {}}
          isEdit={false}
        />
      );
      expect(wrapper.find('[data-test-subj="snInstallationCallout"]').exists()).toBeFalsy();
      expect(wrapper.find('[data-test-subj="snDeprecatedCallout"]').exists()).toBeTruthy();
      expect(wrapper.find('[data-test-subj="snApplicationCallout"]').exists()).toBeFalsy();
    });

    test('should get application information when saving the connector', async () => {
      getAppInfoMock.mockResolvedValue(applicationInfoData);

      const wrapper = mountWithIntl(
        <ServiceNowConnectorFields
          action={usesImportSetApiConnector}
          errors={{ apiUrl: [], username: [], password: [] }}
          editActionConfig={() => {}}
          editActionSecrets={() => {}}
          readOnly={false}
          setCallbacks={setCallbacks}
          isEdit={false}
        />
      );

      await act(async () => {
        await beforeActionConnectorSaveFn();
      });

      expect(getAppInfoMock).toHaveBeenCalledTimes(1);
      expect(wrapper.find('[data-test-subj="snApplicationCallout"]').exists()).toBeFalsy();
    });

    test('should NOT get application information when the connector uses the old API', async () => {
      const wrapper = mountWithIntl(
        <ServiceNowConnectorFields
          action={usesTableApiConnector}
          errors={{ apiUrl: [], username: [], password: [] }}
          editActionConfig={() => {}}
          editActionSecrets={() => {}}
          readOnly={false}
          setCallbacks={setCallbacks}
          isEdit={false}
        />
      );

      await act(async () => {
        await beforeActionConnectorSaveFn();
      });

      expect(getAppInfoMock).toHaveBeenCalledTimes(0);
      expect(wrapper.find('[data-test-subj="snApplicationCallout"]').exists()).toBeFalsy();
    });

    test('should render error when save failed', async () => {
      expect.assertions(4);

      const errorMessage = 'request failed';
      getAppInfoMock.mockRejectedValueOnce(new Error(errorMessage));

      const wrapper = mountWithIntl(
        <ServiceNowConnectorFields
          action={usesImportSetApiConnector}
          errors={{ apiUrl: [], username: [], password: [] }}
          editActionConfig={() => {}}
          editActionSecrets={() => {}}
          readOnly={false}
          setCallbacks={setCallbacks}
          isEdit={false}
        />
      );

      await expect(
        // The async is needed so the act will finished before asserting for the callout
        async () => await act(async () => await beforeActionConnectorSaveFn())
      ).rejects.toThrow(errorMessage);
      expect(getAppInfoMock).toHaveBeenCalledTimes(1);

      wrapper.update();
      expect(wrapper.find('[data-test-subj="snApplicationCallout"]').exists()).toBeTruthy();
      expect(
        wrapper
          .find('[data-test-subj="snApplicationCallout"]')
          .first()
          .text()
          .includes(errorMessage)
      ).toBeTruthy();
    });

    test('should render error when the response is a REST api error', async () => {
      expect.assertions(4);

      const errorMessage = 'request failed';
      getAppInfoMock.mockResolvedValue({ error: { message: errorMessage }, status: 'failure' });

      const wrapper = mountWithIntl(
        <ServiceNowConnectorFields
          action={usesImportSetApiConnector}
          errors={{ apiUrl: [], username: [], password: [] }}
          editActionConfig={() => {}}
          editActionSecrets={() => {}}
          readOnly={false}
          setCallbacks={setCallbacks}
          isEdit={false}
        />
      );

      await expect(
        // The async is needed so the act will finished before asserting for the callout
        async () => await act(async () => await beforeActionConnectorSaveFn())
      ).rejects.toThrow(errorMessage);
      expect(getAppInfoMock).toHaveBeenCalledTimes(1);

      wrapper.update();
      expect(wrapper.find('[data-test-subj="snApplicationCallout"]').exists()).toBeTruthy();
      expect(
        wrapper
          .find('[data-test-subj="snApplicationCallout"]')
          .first()
          .text()
          .includes(errorMessage)
      ).toBeTruthy();
    });

    test('should migrate the deprecated connector when the application throws', async () => {
      getAppInfoMock.mockResolvedValue(applicationInfoData);
      const wrapper = mountWithIntl(
        <ServiceNowConnectorFields
          action={usesTableApiConnector}
          errors={{ apiUrl: [], username: [], password: [] }}
          editActionConfig={() => {}}
          editActionSecrets={() => {}}
          readOnly={false}
          setCallbacks={setCallbacks}
          isEdit={false}
        />
      );

      expect(wrapper.find('[data-test-subj="update-connector-btn"]').exists()).toBeTruthy();
      wrapper.find('[data-test-subj="update-connector-btn"]').first().simulate('click');
      expect(wrapper.find('[data-test-subj="updateConnectorForm"]').exists()).toBeTruthy();

      await act(async () => {
        // Update the connector
        wrapper.find('[data-test-subj="snUpdateInstallationSubmit"]').first().simulate('click');
      });

      expect(getAppInfoMock).toHaveBeenCalledTimes(1);
      expect(updateActionConnectorMock).toHaveBeenCalledWith(
        expect.objectContaining({
          id: usesTableApiConnector.id,
          connector: {
            name: usesTableApiConnector.name,
            config: { ...usesTableApiConnector.config, usesTableApi: false },
            secrets: usesTableApiConnector.secrets,
          },
        })
      );

      expect(services.notifications.toasts.addSuccess).toHaveBeenCalledWith({
        text: 'Connector has been updated.',
        title: 'SN connector updated',
      });

      // The flyout is closed
      wrapper.update();
      expect(wrapper.find('[data-test-subj="updateConnectorForm"]').exists()).toBeFalsy();
    });

    test('should NOT migrate the deprecated connector when there is an error', async () => {
      const errorMessage = 'request failed';
      getAppInfoMock.mockRejectedValueOnce(new Error(errorMessage));

      const wrapper = mountWithIntl(
        <ServiceNowConnectorFields
          action={usesTableApiConnector}
          errors={{ apiUrl: [], username: [], password: [] }}
          editActionConfig={() => {}}
          editActionSecrets={() => {}}
          readOnly={false}
          setCallbacks={setCallbacks}
          isEdit={false}
        />
      );

      expect(wrapper.find('[data-test-subj="update-connector-btn"]').exists()).toBeTruthy();
      wrapper.find('[data-test-subj="update-connector-btn"]').first().simulate('click');
      expect(wrapper.find('[data-test-subj="updateConnectorForm"]').exists()).toBeTruthy();

      // The async is needed so the act will finished before asserting for the callout
      await act(async () => {
        wrapper.find('[data-test-subj="snUpdateInstallationSubmit"]').first().simulate('click');
      });

      expect(getAppInfoMock).toHaveBeenCalledTimes(1);
      expect(updateActionConnectorMock).not.toHaveBeenCalled();

      expect(services.notifications.toasts.addSuccess).not.toHaveBeenCalled();

      // The flyout is still open
      wrapper.update();
      expect(wrapper.find('[data-test-subj="updateConnectorForm"]').exists()).toBeTruthy();

      // The error message should be shown to the user
      expect(
        wrapper
          .find('[data-test-subj="updateConnectorForm"] [data-test-subj="snApplicationCallout"]')
          .exists()
      ).toBeTruthy();
      expect(
        wrapper
          .find('[data-test-subj="updateConnectorForm"] [data-test-subj="snApplicationCallout"]')
          .first()
          .text()
          .includes(errorMessage)
      ).toBeTruthy();
    });

    test('should set the usesTableApi to false when creating a connector', async () => {
      const newConnector = { ...usesTableApiConnector, config: {}, secrets: {} };
      const editActionConfig = jest.fn();

      mountWithIntl(
        <ServiceNowConnectorFields
          // @ts-expect-error
          action={newConnector}
          errors={{ apiUrl: [], username: [], password: [] }}
          editActionConfig={editActionConfig}
          editActionSecrets={() => {}}
          readOnly={false}
          setCallbacks={setCallbacks}
          isEdit={false}
        />
      );

      expect(editActionConfig).toHaveBeenCalledWith('usesTableApi', false);
    });

    test('it should set the legacy attribute if it is not undefined', async () => {
      const editActionConfig = jest.fn();

      mountWithIntl(
        <ServiceNowConnectorFields
          action={usesTableApiConnector}
          errors={{ apiUrl: [], username: [], password: [] }}
          editActionConfig={editActionConfig}
          editActionSecrets={() => {}}
          readOnly={false}
          setCallbacks={setCallbacks}
          isEdit={false}
        />
      );

      expect(editActionConfig).not.toHaveBeenCalled();
    });
  });
});
