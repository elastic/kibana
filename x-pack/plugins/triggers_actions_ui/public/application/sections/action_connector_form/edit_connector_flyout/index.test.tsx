/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { lazy } from 'react';

import { actionTypeRegistryMock } from '../../../action_type_registry.mock';
import userEvent from '@testing-library/user-event';
import { waitFor, act } from '@testing-library/react';
import EditConnectorFlyout from '.';
import { ActionConnector, EditConnectorTabs, GenericValidationResult } from '../../../../types';
import { betaBadgeProps } from '../beta_badge_props';
import { AppMockRenderer, createAppMockRenderer } from '../../test_utils';

const updateConnectorResponse = {
  connector_type_id: 'test',
  is_preconfigured: false,
  is_deprecated: false,
  name: 'My test',
  config: { testTextField: 'My text field' },
  secrets: {},
  id: '123',
};

const executeConnectorResponse = {
  status: 'ok',
  data: {},
};

const connector: ActionConnector = {
  id: '123',
  name: 'My test',
  actionTypeId: '.test',
  config: { testTextField: 'My text field' },
  secrets: { secretTextField: 'super secret' },
  isDeprecated: false,
  isPreconfigured: false,
  isMissingSecrets: false,
  isSystemAction: false,
};

describe('EditConnectorFlyout', () => {
  let appMockRenderer: AppMockRenderer;
  const onClose = jest.fn();
  const onConnectorUpdated = jest.fn();

  const actionTypeModel = actionTypeRegistryMock.createMockActionTypeModel({
    actionConnectorFields: lazy(() => import('../connector_mock')),
    validateParams: (): Promise<GenericValidationResult<unknown>> => {
      const validationResult = { errors: {} };
      return Promise.resolve(validationResult);
    },
  });

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
    appMockRenderer.coreStart.http.put = jest.fn().mockResolvedValue(updateConnectorResponse);
    appMockRenderer.coreStart.http.post = jest.fn().mockResolvedValue(executeConnectorResponse);
  });

  it('renders', async () => {
    const { getByTestId } = appMockRenderer.render(
      <EditConnectorFlyout
        actionTypeRegistry={actionTypeRegistry}
        onClose={onClose}
        connector={connector}
        onConnectorUpdated={onConnectorUpdated}
      />
    );

    expect(getByTestId('edit-connector-flyout')).toBeInTheDocument();
    expect(getByTestId('edit-connector-flyout-header')).toBeInTheDocument();
    expect(getByTestId('edit-connector-flyout-footer')).toBeInTheDocument();
  });

  it('enables save button when the form is modified', async () => {
    const { getByTestId } = appMockRenderer.render(
      <EditConnectorFlyout
        actionTypeRegistry={actionTypeRegistry}
        onClose={onClose}
        connector={connector}
        onConnectorUpdated={onConnectorUpdated}
      />
    );
    expect(getByTestId('edit-connector-flyout-save-btn')).toBeDisabled();

    await act(async () => {
      await userEvent.clear(getByTestId('nameInput'));
      await userEvent.type(getByTestId('nameInput'), 'My new name', {
        delay: 10,
      });
    });

    expect(getByTestId('edit-connector-flyout-save-btn')).not.toBeDisabled();
  });

  it('shows a confirmation modal on close if the form is modified', async () => {
    const { getByTestId, getByText } = appMockRenderer.render(
      <EditConnectorFlyout
        actionTypeRegistry={actionTypeRegistry}
        onClose={onClose}
        connector={connector}
        onConnectorUpdated={onConnectorUpdated}
      />
    );
    expect(getByTestId('edit-connector-flyout-save-btn')).toBeDisabled();

    await act(async () => {
      await userEvent.clear(getByTestId('nameInput'));
      await userEvent.type(getByTestId('nameInput'), 'My new name', {
        delay: 10,
      });
    });

    act(() => {
      userEvent.click(getByTestId('edit-connector-flyout-close-btn'));
    });

    expect(getByText('Discard unsaved changes to connector?')).toBeInTheDocument();
  });

  it('renders the connector form correctly', async () => {
    const { getByTestId, queryByText } = appMockRenderer.render(
      <EditConnectorFlyout
        actionTypeRegistry={actionTypeRegistry}
        onClose={onClose}
        connector={connector}
        onConnectorUpdated={onConnectorUpdated}
      />
    );

    await waitFor(() => {
      expect(getByTestId('nameInput')).toBeInTheDocument();
      expect(getByTestId('test-connector-text-field')).toBeInTheDocument();
    });

    expect(queryByText('This connector is readonly.')).not.toBeInTheDocument();
    expect(getByTestId('nameInput')).toHaveValue('My test');
    expect(getByTestId('test-connector-text-field')).toHaveValue('My text field');
  });

  it('removes the secrets from the connector', async () => {
    const { getByTestId } = appMockRenderer.render(
      <EditConnectorFlyout
        actionTypeRegistry={actionTypeRegistry}
        onClose={onClose}
        connector={connector}
        onConnectorUpdated={onConnectorUpdated}
      />
    );

    await waitFor(() => {
      expect(getByTestId('test-connector-secret-text-field')).toBeInTheDocument();
    });

    expect(getByTestId('test-connector-secret-text-field')).toHaveValue('');
  });

  it('renders correctly if the connector is preconfigured', async () => {
    const { getByText } = appMockRenderer.render(
      <EditConnectorFlyout
        actionTypeRegistry={actionTypeRegistry}
        onClose={onClose}
        connector={{ ...connector, isPreconfigured: true }}
        onConnectorUpdated={onConnectorUpdated}
      />
    );

    expect(getByText('This connector is readonly.')).toBeInTheDocument();
  });

  it('shows the buttons', async () => {
    const { getByTestId } = appMockRenderer.render(
      <EditConnectorFlyout
        actionTypeRegistry={actionTypeRegistry}
        onClose={onClose}
        connector={connector}
        onConnectorUpdated={onConnectorUpdated}
      />
    );

    expect(getByTestId('edit-connector-flyout-save-btn')).toBeInTheDocument();
    expect(getByTestId('edit-connector-flyout-close-btn')).toBeInTheDocument();
  });

  it('does not show the save button if the use does not have permissions to update connector', async () => {
    appMockRenderer.coreStart.application.capabilities = {
      ...appMockRenderer.coreStart.application.capabilities,
      actions: { save: false, show: true },
    };

    const { queryByTestId } = appMockRenderer.render(
      <EditConnectorFlyout
        actionTypeRegistry={actionTypeRegistry}
        onClose={onClose}
        connector={connector}
        onConnectorUpdated={onConnectorUpdated}
      />
    );

    expect(queryByTestId('edit-connector-flyout-save-btn')).not.toBeInTheDocument();
  });

  it('does not show the save button if the connector is preconfigured', async () => {
    const { queryByTestId } = appMockRenderer.render(
      <EditConnectorFlyout
        actionTypeRegistry={actionTypeRegistry}
        onClose={onClose}
        connector={{ ...connector, isPreconfigured: true }}
        onConnectorUpdated={onConnectorUpdated}
      />
    );

    expect(queryByTestId('edit-connector-flyout-save-btn')).not.toBeInTheDocument();
  });

  it('disables the buttons when there are error on the form', async () => {
    const { getByTestId } = appMockRenderer.render(
      <EditConnectorFlyout
        actionTypeRegistry={actionTypeRegistry}
        onClose={onClose}
        connector={connector}
        onConnectorUpdated={onConnectorUpdated}
      />
    );

    await waitFor(() => {
      expect(getByTestId('test-connector-text-field')).toBeInTheDocument();
    });

    act(() => {
      /**
       * Clear the name so the form can be invalid
       */
      userEvent.clear(getByTestId('nameInput'));
    });
    act(() => {
      userEvent.click(getByTestId('edit-connector-flyout-save-btn'));
    });

    await waitFor(() => {
      expect(getByTestId('edit-connector-flyout-close-btn')).not.toBeDisabled();
      expect(getByTestId('edit-connector-flyout-save-btn')).toBeDisabled();
    });
  });

  describe('Header', () => {
    it('shows the icon', async () => {
      const { getByTestId } = appMockRenderer.render(
        <EditConnectorFlyout
          actionTypeRegistry={actionTypeRegistry}
          onClose={onClose}
          connector={connector}
          onConnectorUpdated={onConnectorUpdated}
        />
      );

      expect(getByTestId('edit-connector-flyout-header-icon')).toBeInTheDocument();
    });

    it('does not shows the icon when is not defined', async () => {
      // @ts-expect-error
      actionTypeRegistry.get.mockReturnValue({ ...actionTypeModel, iconClass: undefined });
      const { queryByTestId } = appMockRenderer.render(
        <EditConnectorFlyout
          actionTypeRegistry={actionTypeRegistry}
          onClose={onClose}
          connector={connector}
          onConnectorUpdated={onConnectorUpdated}
        />
      );

      expect(queryByTestId('edit-connector-flyout-header-icon')).not.toBeInTheDocument();
    });

    it('shows the correct title', async () => {
      const { getByText } = appMockRenderer.render(
        <EditConnectorFlyout
          actionTypeRegistry={actionTypeRegistry}
          onClose={onClose}
          connector={connector}
          onConnectorUpdated={onConnectorUpdated}
        />
      );

      expect(getByText('Edit connector')).toBeInTheDocument();
    });

    it('shows the correct on preconfigured connectors', async () => {
      const { getByTestId } = appMockRenderer.render(
        <EditConnectorFlyout
          actionTypeRegistry={actionTypeRegistry}
          onClose={onClose}
          connector={{ ...connector, isPreconfigured: true }}
          onConnectorUpdated={onConnectorUpdated}
        />
      );

      expect(getByTestId('preconfiguredBadge')).toBeInTheDocument();
    });

    it('does not show beta badge when isExperimental is false', async () => {
      const { queryByText } = appMockRenderer.render(
        <EditConnectorFlyout
          actionTypeRegistry={actionTypeRegistry}
          onClose={onClose}
          connector={{ ...connector, isPreconfigured: true }}
          onConnectorUpdated={onConnectorUpdated}
        />
      );
      await act(() => Promise.resolve());
      expect(queryByText(betaBadgeProps.label)).not.toBeInTheDocument();
    });

    it('shows beta badge when isExperimental is true', async () => {
      actionTypeRegistry.get.mockReturnValue({ ...actionTypeModel, isExperimental: true });
      const { getByText } = appMockRenderer.render(
        <EditConnectorFlyout
          actionTypeRegistry={actionTypeRegistry}
          onClose={onClose}
          connector={{ ...connector, isPreconfigured: true }}
          onConnectorUpdated={onConnectorUpdated}
        />
      );
      await act(() => Promise.resolve());
      expect(getByText(betaBadgeProps.label)).toBeInTheDocument();
    });
  });

  describe('Tabs', () => {
    it('shows the tabs', async () => {
      const { getByTestId } = appMockRenderer.render(
        <EditConnectorFlyout
          actionTypeRegistry={actionTypeRegistry}
          onClose={onClose}
          connector={connector}
          onConnectorUpdated={onConnectorUpdated}
        />
      );

      expect(getByTestId('configureConnectorTab')).toBeInTheDocument();
      expect(getByTestId('testConnectorTab')).toBeInTheDocument();
    });

    it('navigates to the test form', async () => {
      const { getByTestId } = appMockRenderer.render(
        <EditConnectorFlyout
          actionTypeRegistry={actionTypeRegistry}
          onClose={onClose}
          connector={connector}
          onConnectorUpdated={onConnectorUpdated}
        />
      );

      expect(getByTestId('configureConnectorTab')).toBeInTheDocument();
      expect(getByTestId('testConnectorTab')).toBeInTheDocument();

      act(() => {
        userEvent.click(getByTestId('testConnectorTab'));
      });

      await waitFor(() => {
        expect(getByTestId('test-connector-form')).toBeInTheDocument();
      });
    });

    it('opens the provided tab', async () => {
      const { getByTestId } = appMockRenderer.render(
        <EditConnectorFlyout
          actionTypeRegistry={actionTypeRegistry}
          onClose={onClose}
          connector={connector}
          onConnectorUpdated={onConnectorUpdated}
          tab={EditConnectorTabs.Test}
        />
      );

      await waitFor(() => {
        expect(getByTestId('test-connector-form')).toBeInTheDocument();
      });
    });
  });

  describe('Submitting', () => {
    it('updates the connector correctly', async () => {
      const { getByTestId } = appMockRenderer.render(
        <EditConnectorFlyout
          actionTypeRegistry={actionTypeRegistry}
          onClose={onClose}
          connector={connector}
          onConnectorUpdated={onConnectorUpdated}
        />
      );

      await waitFor(() => {
        expect(getByTestId('test-connector-text-field')).toBeInTheDocument();
      });

      userEvent.clear(getByTestId('nameInput'));
      userEvent.type(getByTestId('nameInput'), 'My new name');
      userEvent.type(getByTestId('test-connector-secret-text-field'), 'password');

      await waitFor(() => {
        expect(getByTestId('nameInput')).toHaveValue('My new name');
        expect(getByTestId('test-connector-secret-text-field')).toHaveValue('password');
      });

      userEvent.click(getByTestId('edit-connector-flyout-save-btn'));

      await waitFor(() => {
        expect(appMockRenderer.coreStart.http.put).toHaveBeenCalledWith(
          '/api/actions/connector/123',
          {
            body: '{"name":"My new name","config":{"testTextField":"My text field"},"secrets":{"secretTextField":"password"}}',
          }
        );
      });

      expect(onClose).not.toHaveBeenCalled();
      expect(onConnectorUpdated).toHaveBeenCalledWith({
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

    it('updates connector form field with latest value', async () => {
      const { getByTestId } = appMockRenderer.render(
        <EditConnectorFlyout
          actionTypeRegistry={actionTypeRegistry}
          onClose={onClose}
          connector={connector}
          onConnectorUpdated={onConnectorUpdated}
        />
      );

      await waitFor(() => {
        expect(getByTestId('test-connector-text-field')).toBeInTheDocument();
      });

      userEvent.clear(getByTestId('test-connector-text-field'));
      userEvent.type(getByTestId('test-connector-text-field'), 'My updated text field');

      await waitFor(() => {
        expect(getByTestId('test-connector-text-field')).toHaveValue('My updated text field');
      });

      userEvent.clear(getByTestId('nameInput'));
      userEvent.type(getByTestId('nameInput'), 'My test');
      userEvent.type(getByTestId('test-connector-secret-text-field'), 'password');

      await waitFor(() => {
        expect(getByTestId('nameInput')).toHaveValue('My test');
        expect(getByTestId('test-connector-secret-text-field')).toHaveValue('password');
      });

      userEvent.click(getByTestId('edit-connector-flyout-save-btn'));

      await waitFor(() => {
        expect(getByTestId('test-connector-text-field')).toHaveValue('My updated text field');
      });
    });

    it('updates the connector and close the flyout correctly', async () => {
      const { getByTestId, getByText } = appMockRenderer.render(
        <EditConnectorFlyout
          actionTypeRegistry={actionTypeRegistry}
          onClose={onClose}
          connector={connector}
          onConnectorUpdated={onConnectorUpdated}
        />
      );

      await waitFor(() => {
        expect(getByTestId('test-connector-text-field')).toBeInTheDocument();
      });

      userEvent.clear(getByTestId('nameInput'));
      userEvent.type(getByTestId('nameInput'), 'My new name');
      userEvent.type(getByTestId('test-connector-secret-text-field'), 'password');

      await waitFor(() => {
        expect(getByTestId('nameInput')).toHaveValue('My new name');
        expect(getByTestId('test-connector-secret-text-field')).toHaveValue('password');
      });

      userEvent.click(getByTestId('edit-connector-flyout-save-btn'));

      await waitFor(() => {
        expect(appMockRenderer.coreStart.http.put).toHaveBeenCalledWith(
          '/api/actions/connector/123',
          {
            body: '{"name":"My new name","config":{"testTextField":"My text field"},"secrets":{"secretTextField":"password"}}',
          }
        );
      });

      expect(getByText('Changes Saved')).toBeInTheDocument();

      userEvent.click(getByTestId('edit-connector-flyout-close-btn'));

      expect(onClose).toHaveBeenCalled();
      expect(onConnectorUpdated).toHaveBeenCalledWith({
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
        <EditConnectorFlyout
          actionTypeRegistry={actionTypeRegistry}
          onClose={onClose}
          onConnectorUpdated={onConnectorUpdated}
          connector={connector}
        />
      );

      await waitFor(() => {
        expect(getByTestId('test-connector-error-text-field')).toBeInTheDocument();
      });

      userEvent.clear(getByTestId('nameInput'));
      userEvent.type(getByTestId('nameInput'), 'My new name');

      await waitFor(() => {
        expect(getByTestId('nameInput')).toHaveValue('My new name');
      });

      userEvent.click(getByTestId('edit-connector-flyout-save-btn'));

      await waitFor(() => {
        expect(getByText('Error on pre submit validator')).toBeInTheDocument();
      });
    });
  });

  describe('Testing', () => {
    it('tests the connector correctly', async () => {
      const { getByTestId } = appMockRenderer.render(
        <EditConnectorFlyout
          actionTypeRegistry={actionTypeRegistry}
          onClose={onClose}
          connector={connector}
          onConnectorUpdated={onConnectorUpdated}
          tab={EditConnectorTabs.Test}
        />
      );

      await waitFor(() => {
        expect(getByTestId('test-connector-form')).toBeInTheDocument();
      });

      expect(getByTestId('executionAwaiting')).toBeInTheDocument();

      act(() => {
        userEvent.click(getByTestId('executeActionButton'));
      });

      await waitFor(() => {
        expect(appMockRenderer.coreStart.http.post).toHaveBeenCalledWith(
          '/api/actions/connector/123/_execute',
          { body: '{"params":{}}' }
        );
      });

      expect(getByTestId('executionSuccessfulResult')).toBeInTheDocument();
    });

    it('resets the results when changing tabs', async () => {
      const { getByTestId } = appMockRenderer.render(
        <EditConnectorFlyout
          actionTypeRegistry={actionTypeRegistry}
          onClose={onClose}
          connector={connector}
          onConnectorUpdated={onConnectorUpdated}
          tab={EditConnectorTabs.Test}
        />
      );

      await waitFor(() => {
        expect(getByTestId('test-connector-form')).toBeInTheDocument();
      });

      expect(getByTestId('executionAwaiting')).toBeInTheDocument();

      act(() => {
        userEvent.click(getByTestId('executeActionButton'));
      });

      await waitFor(() => {
        expect(getByTestId('executionSuccessfulResult')).toBeInTheDocument();
      });

      act(() => {
        userEvent.click(getByTestId('configureConnectorTab'));
      });

      await waitFor(() => {
        expect(getByTestId('nameInput')).toBeInTheDocument();
      });

      act(() => {
        userEvent.click(getByTestId('testConnectorTab'));
      });

      await waitFor(() => {
        expect(getByTestId('test-connector-form')).toBeInTheDocument();
      });

      expect(getByTestId('executionAwaiting')).toBeInTheDocument();
    });

    it('throws an error correctly', async () => {
      appMockRenderer.coreStart.http.post = jest
        .fn()
        .mockRejectedValue(new Error('error executing'));

      const { getByTestId } = appMockRenderer.render(
        <EditConnectorFlyout
          actionTypeRegistry={actionTypeRegistry}
          onClose={onClose}
          connector={connector}
          onConnectorUpdated={onConnectorUpdated}
          tab={EditConnectorTabs.Test}
        />
      );

      await waitFor(() => {
        expect(getByTestId('test-connector-form')).toBeInTheDocument();
      });

      act(() => {
        userEvent.click(getByTestId('executeActionButton'));
      });

      await waitFor(() => {
        expect(getByTestId('executionFailureResult')).toBeInTheDocument();
      });
    });

    it('resets the results when modifying the form', async () => {
      const { getByTestId } = appMockRenderer.render(
        <EditConnectorFlyout
          actionTypeRegistry={actionTypeRegistry}
          onClose={onClose}
          connector={connector}
          onConnectorUpdated={onConnectorUpdated}
          tab={EditConnectorTabs.Test}
        />
      );

      await waitFor(() => {
        expect(getByTestId('test-connector-form')).toBeInTheDocument();
      });

      act(() => {
        userEvent.click(getByTestId('executeActionButton'));
      });

      await waitFor(() => {
        expect(getByTestId('executionSuccessfulResult')).toBeInTheDocument();
      });

      act(() => {
        userEvent.click(getByTestId('configureConnectorTab'));
      });

      await waitFor(() => {
        expect(getByTestId('nameInput')).toBeInTheDocument();
      });

      await act(async () => {
        await userEvent.clear(getByTestId('nameInput'));
        await userEvent.type(getByTestId('nameInput'), 'My new name', {
          delay: 10,
        });
      });

      act(() => {
        userEvent.click(getByTestId('testConnectorTab'));
      });

      await waitFor(() => {
        expect(getByTestId('test-connector-form')).toBeInTheDocument();
      });

      expect(getByTestId('executionAwaiting')).toBeInTheDocument();
      expect(getByTestId('executeActionButton')).toBeDisabled();
    });
  });
});
