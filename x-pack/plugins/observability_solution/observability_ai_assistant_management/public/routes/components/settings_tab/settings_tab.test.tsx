/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, waitFor } from '@testing-library/react';
import { render } from '../../../helpers/test_helper';
import { useAppContext } from '../../../hooks/use_app_context';
import { SettingsTab } from './settings_tab';
import {
  aiAssistantLogsIndexPattern,
  aiAssistantResponseLanguage,
} from '@kbn/observability-ai-assistant-plugin/server';
import { coreMock } from '@kbn/core/public/mocks';
import { uiSettings } from '../../../../common';
import { merge } from 'lodash';

jest.mock('../../../hooks/use_app_context');

const useAppContextMock = useAppContext as jest.Mock;
const navigateToAppMock = jest.fn(() => Promise.resolve());

describe('SettingsTab', () => {
  beforeEach(() => {
    useAppContextMock.mockReturnValue({
      uiSettings: {
        get: jest.fn(),
      },
      docLinks: {
        links: {},
      },
      application: { navigateToApp: navigateToAppMock },
      observabilityAIAssistant: {
        useGenAIConnectors: () => ({
          connectors: [
            { name: 'openAi', id: 'openAi' },
            { name: 'azureOpenAi', id: 'azureOpenAi' },
            { name: 'bedrock', id: 'bedrock' },
          ],
        }),
        useUserPreferredLanguage: () => ({
          LANGUAGE_OPTIONS: [{ label: 'English' }],
          selectedLanguage: 'English',
          setSelectedLanguage: () => {},
          getPreferredLanguage: () => 'English',
        }),
      },
    });
  });

  it('should offer a way to configure Observability AI Assistant visibility in apps', () => {
    const { getByTestId } = render(<SettingsTab />);

    fireEvent.click(getByTestId('settingsTabGoToSpacesButton'));

    expect(navigateToAppMock).toBeCalledWith('management', { path: '/kibana/spaces' });
  });

  it('should offer a way to configure Gen AI connectors', () => {
    const { getByTestId } = render(<SettingsTab />);

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
        coreStartMock: merge(coreMock.createStart(), {
          settings: {
            client: {
              set: settingsClientSet,
              getAll: () => uiSettings,
            },
          },
        }),
      });

      await waitFor(() => expect(container.querySelector('.euiLoadingSpinner')).toBeNull());

      fireEvent.input(getByTestId(`management-settings-editField-${aiAssistantLogsIndexPattern}`), {
        target: { value: 'observability-ai-assistant-*' },
      });

      fireEvent.change(
        getByTestId(`management-settings-editField-${aiAssistantResponseLanguage}`),
        {
          target: { value: 'da' },
        }
      );

      fireEvent.click(getByTestId('apmBottomBarActionsButton'));

      await waitFor(() => expect(windowLocationReloadMock).toHaveBeenCalledTimes(1));
    });

    afterEach(() => {
      window.location = windowLocationOriginal;
    });

    it('calls the settings client with correct args', async () => {
      expect(settingsClientSet).toBeCalledWith(
        aiAssistantLogsIndexPattern,
        'observability-ai-assistant-*'
      );
      expect(settingsClientSet).toBeCalledWith(aiAssistantResponseLanguage, 'da');
    });
  });
});
