/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { lazy } from 'react';

import { actionTypeRegistryMock } from '../../../action_type_registry.mock';
import userEvent from '@testing-library/user-event';
import { waitFor } from '@testing-library/dom';
import { act } from '@testing-library/react';
import {
  AppMockRenderer,
  createAppMockRenderer,
} from '../../../components/builtin_action_types/test_utils';
import CreateConnectorFlyout from '.';

const createConnectorResponse = {
  connector_type_id: 'test',
  is_preconfigured: false,
  is_deprecated: false,
  name: 'My test',
  config: { testTextField: 'My text field' },
  secrets: {},
  id: '123',
};

describe('CreateConnectorFlyout', () => {
  let appMockRenderer: AppMockRenderer;
  const onClose = jest.fn();
  const onConnectorCreated = jest.fn();
  const onTestConnector = jest.fn();

  const actionTypeModel = actionTypeRegistryMock.createMockActionTypeModel({
    actionConnectorFields: lazy(() => import('../connector_mock')),
  });

  const actionTypes = [
    {
      id: actionTypeModel.id,
      enabled: true,
      name: 'Test',
      enabledInConfig: true,
      enabledInLicense: true,
      minimumLicenseRequired: 'basic' as const,
    },
  ];

  const actionTypeRegistry = actionTypeRegistryMock.create();

  beforeEach(() => {
    jest.clearAllMocks();
    actionTypeRegistry.has.mockReturnValue(true);
    actionTypeRegistry.get.mockReturnValue(actionTypeModel);
    appMockRenderer = createAppMockRenderer();
    appMockRenderer.coreStart.application.capabilities = {
      ...appMockRenderer.coreStart.application.capabilities,
      actions: { save: true, show: true },
    };
    appMockRenderer.coreStart.http.post = jest.fn().mockResolvedValue(createConnectorResponse);
  });

  it('renders', async () => {
    const { getByTestId } = appMockRenderer.render(
      <CreateConnectorFlyout
        actionTypeRegistry={actionTypeRegistry}
        onClose={onClose}
        supportedActionTypes={actionTypes}
        onConnectorCreated={onConnectorCreated}
        onTestConnector={onTestConnector}
      />
    );

    expect(getByTestId('create-connector-flyout')).toBeInTheDocument();
    expect(getByTestId('create-connector-flyout-header')).toBeInTheDocument();
    expect(getByTestId('create-connector-flyout-footer')).toBeInTheDocument();
  });

  it('renders action type menu on flyout open', () => {
    const { getByTestId } = appMockRenderer.render(
      <CreateConnectorFlyout
        actionTypeRegistry={actionTypeRegistry}
        onClose={onClose}
        supportedActionTypes={actionTypes}
        onConnectorCreated={onConnectorCreated}
        onTestConnector={onTestConnector}
      />
    );

    expect(getByTestId(`${actionTypeModel.id}-card`)).toBeInTheDocument();
  });

  describe('Licensing', () => {
    it('renders banner with subscription links when gold features are disabled due to licensing', () => {
      const disabledActionType = actionTypeRegistryMock.createMockActionTypeModel();

      const { getByTestId } = appMockRenderer.render(
        <CreateConnectorFlyout
          actionTypeRegistry={actionTypeRegistry}
          onClose={onClose}
          supportedActionTypes={[
            ...actionTypes,
            {
              id: disabledActionType.id,
              enabled: true,
              name: 'Test',
              enabledInConfig: true,
              enabledInLicense: false,
              minimumLicenseRequired: 'gold',
            },
          ]}
          onConnectorCreated={onConnectorCreated}
          onTestConnector={onTestConnector}
        />
      );

      expect(getByTestId('upgrade-your-license-callout')).toBeInTheDocument();
    });

    it('does not render banner with subscription links when only platinum features are disabled due to licensing', () => {
      const disabledActionType = actionTypeRegistryMock.createMockActionTypeModel();

      const { queryByTestId } = appMockRenderer.render(
        <CreateConnectorFlyout
          actionTypeRegistry={actionTypeRegistry}
          onClose={onClose}
          supportedActionTypes={[
            ...actionTypes,
            {
              id: disabledActionType.id,
              enabled: true,
              name: 'Test',
              enabledInConfig: true,
              enabledInLicense: false,
              minimumLicenseRequired: 'platinum',
            },
          ]}
          onConnectorCreated={onConnectorCreated}
          onTestConnector={onTestConnector}
        />
      );

      expect(queryByTestId('upgrade-your-license-callout')).toBeFalsy();
    });

    it('does not render banner with subscription links when only enterprise features are disabled due to licensing', () => {
      const disabledActionType = actionTypeRegistryMock.createMockActionTypeModel();

      const { queryByTestId } = appMockRenderer.render(
        <CreateConnectorFlyout
          actionTypeRegistry={actionTypeRegistry}
          onClose={onClose}
          supportedActionTypes={[
            ...actionTypes,
            {
              id: disabledActionType.id,
              enabled: true,
              name: 'Test',
              enabledInConfig: true,
              enabledInLicense: false,
              minimumLicenseRequired: 'enterprise',
            },
          ]}
          onConnectorCreated={onConnectorCreated}
          onTestConnector={onTestConnector}
        />
      );

      expect(queryByTestId('upgrade-your-license-callout')).toBeFalsy();
    });
  });

  describe('Header', () => {
    it('does not shows the icon when selection connector type', async () => {
      const { queryByTestId } = appMockRenderer.render(
        <CreateConnectorFlyout
          actionTypeRegistry={actionTypeRegistry}
          onClose={onClose}
          supportedActionTypes={actionTypes}
          onConnectorCreated={onConnectorCreated}
          onTestConnector={onTestConnector}
        />
      );

      expect(queryByTestId('create-connector-flyout-header-icon')).not.toBeInTheDocument();
    });

    it('shows the correct title when selecting connector type', async () => {
      const { getByText } = appMockRenderer.render(
        <CreateConnectorFlyout
          actionTypeRegistry={actionTypeRegistry}
          onClose={onClose}
          supportedActionTypes={actionTypes}
          onConnectorCreated={onConnectorCreated}
          onTestConnector={onTestConnector}
        />
      );

      expect(getByText('Select a connector')).toBeInTheDocument();
    });

    it('shows the icon when the connector type is selected', async () => {
      const { getByTestId, getByText, queryByText } = appMockRenderer.render(
        <CreateConnectorFlyout
          actionTypeRegistry={actionTypeRegistry}
          onClose={onClose}
          supportedActionTypes={actionTypes}
          onConnectorCreated={onConnectorCreated}
          onTestConnector={onTestConnector}
        />
      );

      act(() => {
        userEvent.click(getByTestId(`${actionTypeModel.id}-card`));
      });

      await waitFor(() => {
        expect(getByTestId('test-connector-text-field')).toBeInTheDocument();
      });

      expect(queryByText('Select a connector')).not.toBeInTheDocument();
      expect(getByTestId('create-connector-flyout-header-icon')).toBeInTheDocument();
      expect(getByText('Test connector')).toBeInTheDocument();
      expect(getByText(`selectMessage-${actionTypeModel.id}`)).toBeInTheDocument();
    });
  });

  describe('Submitting', () => {
    it('creates a connector correctly', async () => {
      const { getByTestId } = appMockRenderer.render(
        <CreateConnectorFlyout
          actionTypeRegistry={actionTypeRegistry}
          onClose={onClose}
          supportedActionTypes={actionTypes}
          onConnectorCreated={onConnectorCreated}
          onTestConnector={onTestConnector}
        />
      );

      act(() => {
        userEvent.click(getByTestId(`${actionTypeModel.id}-card`));
      });

      await waitFor(() => {
        expect(getByTestId('test-connector-text-field')).toBeInTheDocument();
      });

      await act(async () => {
        await userEvent.type(getByTestId('nameInput'), 'My test', {
          delay: 100,
        });
        await userEvent.type(getByTestId('test-connector-text-field'), 'My text field', {
          delay: 100,
        });
      });

      act(() => {
        userEvent.click(getByTestId('create-connector-flyout-save-btn'));
      });

      await waitFor(() => {
        expect(appMockRenderer.coreStart.http.post).toHaveBeenCalledWith('/api/actions/connector', {
          body: `{"name":"My test","config":{"testTextField":"My text field"},"secrets":{},"connector_type_id":"${actionTypeModel.id}"}`,
        });
      });

      expect(onClose).toHaveBeenCalled();
      expect(onTestConnector).not.toHaveBeenCalled();
      expect(onConnectorCreated).toHaveBeenCalledWith({
        actionTypeId: 'test',
        config: { testTextField: 'My text field' },
        id: '123',
        isDeprecated: false,
        isMissingSecrets: undefined,
        isPreconfigured: false,
        name: 'My test',
        secrets: {},
      });
    });

    it('runs pre submit validator correctly', async () => {
      const errorActionTypeModel = actionTypeRegistryMock.createMockActionTypeModel({
        actionConnectorFields: lazy(() => import('../connector_error_mock')),
      });
      actionTypeRegistry.get.mockReturnValue(errorActionTypeModel);

      const { getByTestId, getByText } = appMockRenderer.render(
        <CreateConnectorFlyout
          actionTypeRegistry={actionTypeRegistry}
          onClose={onClose}
          supportedActionTypes={[
            {
              id: errorActionTypeModel.id,
              enabled: true,
              name: 'Test',
              enabledInConfig: true,
              enabledInLicense: true,
              minimumLicenseRequired: 'basic' as const,
            },
          ]}
          onConnectorCreated={onConnectorCreated}
          onTestConnector={onTestConnector}
        />
      );

      act(() => {
        userEvent.click(getByTestId(`${errorActionTypeModel.id}-card`));
      });

      await waitFor(() => {
        expect(getByTestId('test-connector-error-text-field')).toBeInTheDocument();
      });

      await act(async () => {
        await userEvent.type(getByTestId('nameInput'), 'My test', {
          delay: 100,
        });
        await userEvent.type(getByTestId('test-connector-error-text-field'), 'My text field', {
          delay: 100,
        });
      });

      act(() => {
        userEvent.click(getByTestId('create-connector-flyout-save-btn'));
      });

      await waitFor(() => {
        expect(getByText('Error on pre submit validator')).toBeInTheDocument();
      });
    });
  });

  describe('Testing', () => {
    it('saves and test correctly', async () => {
      const { getByTestId } = appMockRenderer.render(
        <CreateConnectorFlyout
          actionTypeRegistry={actionTypeRegistry}
          onClose={onClose}
          supportedActionTypes={actionTypes}
          onConnectorCreated={onConnectorCreated}
          onTestConnector={onTestConnector}
        />
      );

      act(() => {
        userEvent.click(getByTestId(`${actionTypeModel.id}-card`));
      });

      await waitFor(() => {
        expect(getByTestId('test-connector-text-field')).toBeInTheDocument();
      });

      await act(async () => {
        await userEvent.type(getByTestId('nameInput'), 'My test', {
          delay: 100,
        });
        await userEvent.type(getByTestId('test-connector-text-field'), 'My text field', {
          delay: 100,
        });
      });

      act(() => {
        userEvent.click(getByTestId('create-connector-flyout-save-test-btn'));
      });

      await waitFor(() => {
        expect(appMockRenderer.coreStart.http.post).toHaveBeenCalledWith('/api/actions/connector', {
          body: `{"name":"My test","config":{"testTextField":"My text field"},"secrets":{},"connector_type_id":"${actionTypeModel.id}"}`,
        });
      });

      expect(onClose).toHaveBeenCalled();
      expect(onTestConnector).toHaveBeenCalledWith({
        actionTypeId: 'test',
        config: { testTextField: 'My text field' },
        id: '123',
        isDeprecated: false,
        isMissingSecrets: undefined,
        isPreconfigured: false,
        name: 'My test',
        secrets: {},
      });
      expect(onConnectorCreated).toHaveBeenCalledWith({
        actionTypeId: 'test',
        config: { testTextField: 'My text field' },
        id: '123',
        isDeprecated: false,
        isMissingSecrets: undefined,
        isPreconfigured: false,
        name: 'My test',
        secrets: {},
      });
    });
  });

  describe('Footer', () => {
    it('shows the buttons', async () => {
      const { getByTestId } = appMockRenderer.render(
        <CreateConnectorFlyout
          actionTypeRegistry={actionTypeRegistry}
          onClose={onClose}
          supportedActionTypes={actionTypes}
          onConnectorCreated={onConnectorCreated}
          onTestConnector={onTestConnector}
        />
      );

      expect(getByTestId('create-connector-flyout-cancel-btn')).toBeInTheDocument();
      expect(getByTestId('create-connector-flyout-save-test-btn')).toBeInTheDocument();
      expect(getByTestId('create-connector-flyout-save-btn')).toBeInTheDocument();
    });

    it('shows the back button when selecting an action type', async () => {
      const { getByTestId } = appMockRenderer.render(
        <CreateConnectorFlyout
          actionTypeRegistry={actionTypeRegistry}
          onClose={onClose}
          supportedActionTypes={actionTypes}
          onConnectorCreated={onConnectorCreated}
          onTestConnector={onTestConnector}
        />
      );

      act(() => {
        userEvent.click(getByTestId(`${actionTypeModel.id}-card`));
      });

      await waitFor(() => {
        expect(getByTestId('create-connector-flyout-back-btn')).toBeInTheDocument();
      });
    });

    it('shows the action types when pressing the back button', async () => {
      const { getByTestId } = appMockRenderer.render(
        <CreateConnectorFlyout
          actionTypeRegistry={actionTypeRegistry}
          onClose={onClose}
          supportedActionTypes={actionTypes}
          onConnectorCreated={onConnectorCreated}
          onTestConnector={onTestConnector}
        />
      );

      act(() => {
        userEvent.click(getByTestId(`${actionTypeModel.id}-card`));
      });

      await waitFor(() => {
        expect(getByTestId('create-connector-flyout-back-btn')).toBeInTheDocument();
        expect(getByTestId('nameInput')).toBeInTheDocument();
      });

      act(() => {
        userEvent.click(getByTestId('create-connector-flyout-back-btn'));
      });

      expect(getByTestId(`${actionTypeModel.id}-card`)).toBeInTheDocument();
    });

    it('does not show the save and test button if the onTestConnector is not provided', async () => {
      const { queryByTestId } = appMockRenderer.render(
        <CreateConnectorFlyout
          actionTypeRegistry={actionTypeRegistry}
          onClose={onClose}
          supportedActionTypes={actionTypes}
          onConnectorCreated={onConnectorCreated}
        />
      );

      expect(queryByTestId('create-connector-flyout-save-test-btn')).not.toBeInTheDocument();
    });

    it('closes the flyout when pressing cancel', async () => {
      const { getByTestId } = appMockRenderer.render(
        <CreateConnectorFlyout
          actionTypeRegistry={actionTypeRegistry}
          onClose={onClose}
          supportedActionTypes={actionTypes}
          onConnectorCreated={onConnectorCreated}
          onTestConnector={onTestConnector}
        />
      );

      act(() => {
        userEvent.click(getByTestId('create-connector-flyout-cancel-btn'));
      });

      expect(onClose).toHaveBeenCalled();
    });

    it('disables the buttons when the user does not have permissions to create a connector', async () => {
      appMockRenderer.coreStart.application.capabilities = {
        ...appMockRenderer.coreStart.application.capabilities,
        actions: { save: false, show: true },
      };

      const { getByTestId } = appMockRenderer.render(
        <CreateConnectorFlyout
          actionTypeRegistry={actionTypeRegistry}
          onClose={onClose}
          supportedActionTypes={actionTypes}
          onConnectorCreated={onConnectorCreated}
          onTestConnector={onTestConnector}
        />
      );

      expect(getByTestId('create-connector-flyout-cancel-btn')).not.toBeDisabled();
      expect(getByTestId('create-connector-flyout-save-test-btn')).toBeDisabled();
      expect(getByTestId('create-connector-flyout-save-btn')).toBeDisabled();
    });

    it('disables the buttons when there are error on the form', async () => {
      const { getByTestId } = appMockRenderer.render(
        <CreateConnectorFlyout
          actionTypeRegistry={actionTypeRegistry}
          onClose={onClose}
          supportedActionTypes={actionTypes}
          onConnectorCreated={onConnectorCreated}
          onTestConnector={onTestConnector}
        />
      );

      act(() => {
        userEvent.click(getByTestId(`${actionTypeModel.id}-card`));
      });

      await waitFor(() => {
        expect(getByTestId('test-connector-text-field')).toBeInTheDocument();
      });

      act(() => {
        userEvent.click(getByTestId('create-connector-flyout-save-btn'));
      });

      await waitFor(() => {
        expect(getByTestId('create-connector-flyout-back-btn')).not.toBeDisabled();
        expect(getByTestId('create-connector-flyout-save-test-btn')).toBeDisabled();
        expect(getByTestId('create-connector-flyout-save-btn')).toBeDisabled();
      });
    });
  });
});
