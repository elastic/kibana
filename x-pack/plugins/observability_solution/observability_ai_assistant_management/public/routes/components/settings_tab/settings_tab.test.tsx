/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, waitFor } from '@testing-library/react';
import { render } from '../../../helpers/test_helper';
import { SettingsTab } from './settings_tab';
import { aiAssistantLogsIndexPattern } from '@kbn/observability-ai-assistant-plugin/server';
import { uiSettings } from '../../../../common/ui_settings';
import { uiSettings as logsDataAccessUiSettings } from '@kbn/logs-data-access-plugin/common/ui_settings';

jest.mock('../../../hooks/use_app_context');

const testUiSettings = {
  ...uiSettings,
  ...logsDataAccessUiSettings,
};

describe('SettingsTab', () => {
  it('should offer a way to configure Observability AI Assistant visibility in apps', () => {
    const navigateToAppMock = jest.fn(() => Promise.resolve());
    const { getByTestId } = render(<SettingsTab />, {
      coreStart: {
        application: { navigateToApp: navigateToAppMock },
      },
    });

    fireEvent.click(getByTestId('settingsTabGoToSpacesButton'));

    expect(navigateToAppMock).toBeCalledWith('management', { path: '/kibana/spaces' });
  });

  it('should offer a way to configure Gen AI connectors', () => {
    const navigateToAppMock = jest.fn(() => Promise.resolve());
    const { getByTestId } = render(<SettingsTab />, {
      coreStart: {
        application: { navigateToApp: navigateToAppMock },
      },
    });

    fireEvent.click(getByTestId('settingsTabGoToConnectorsButton'));

    expect(navigateToAppMock).toBeCalledWith('management', {
      path: '/insightsAndAlerting/triggersActionsConnectors/connectors',
    });
  });

  describe('allows updating the AI Assistant settings', () => {
    const windowLocationReloadMock = jest.fn();
    const windowLocationOriginal = window.location;
    const settingsClientSet = jest.fn();

    beforeEach(async () => {
      Object.defineProperty(window, 'location', {
        value: {
          reload: windowLocationReloadMock,
        },
        writable: true,
      });

      const { getByTestId, container } = render(<SettingsTab />, {
        coreStart: {
          settings: {
            client: {
              set: settingsClientSet,
              getAll: () => testUiSettings,
              validateValue: () => Promise.resolve({ successfulValidation: true, valid: true }),
            },
          },
        },
      });

      await waitFor(() => expect(container.querySelector('.euiLoadingSpinner')).toBeNull());
      fireEvent.change(
        getByTestId(`management-settings-editField-${aiAssistantLogsIndexPattern}`),
        {
          target: { value: 'observability-ai-assistant-*' },
        }
      );

      await waitFor(() =>
        expect(
          getByTestId('observabilityAiAssistantManagementBottomBarActionsButton')
        ).toBeInTheDocument()
      );

      fireEvent.click(getByTestId('observabilityAiAssistantManagementBottomBarActionsButton'));
      await waitFor(() => expect(windowLocationReloadMock).toHaveBeenCalledTimes(1));
    });

    afterEach(() => {
      window.location = windowLocationOriginal;
    });

    it('calls the settings client with correct args', async () => {
      expect(settingsClientSet).toBeCalledWith(aiAssistantLogsIndexPattern, [
        'observability-ai-assistant-*',
      ]);
    });
  });
});
