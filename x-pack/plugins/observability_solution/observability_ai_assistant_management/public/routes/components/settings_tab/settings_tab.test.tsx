/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent } from '@testing-library/react';
import { render } from '../../../helpers/test_helper';
import { useAppContext } from '../../../hooks/use_app_context';
import { SettingsTab } from './settings_tab';

jest.mock('../../../hooks/use_app_context');

const useAppContextMock = useAppContext as jest.Mock;

const navigateToAppMock = jest.fn(() => Promise.resolve());
const settingsClientSet = jest.fn();

describe('SettingsTab', () => {
  beforeEach(() => {
    useAppContextMock.mockReturnValue({
      settings: {
        client: {
          set: settingsClientSet,
        },
      },
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

  it('should allow selection of a configured Observability AI Assistant connector', () => {
    const { getByTestId } = render(<SettingsTab />);

    fireEvent.change(
      getByTestId('management-settings-editField-observability:aiAssistantDefaultConnector'),
      {
        target: { value: 'bedrock' },
      }
    );

    fireEvent.click(getByTestId('apmBottomBarActionsButton'));

    expect(settingsClientSet).toBeCalledWith(
      'observability:aiAssistantDefaultConnector',
      'bedrock'
    );
  });
});
