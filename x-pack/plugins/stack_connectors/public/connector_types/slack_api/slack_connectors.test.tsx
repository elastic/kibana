/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act, render, screen, waitFor } from '@testing-library/react';
import { useKibana } from '@kbn/triggers-actions-ui-plugin/public';
import { createStartServicesMock } from '@kbn/triggers-actions-ui-plugin/public/common/lib/kibana/kibana_react.mock';

import { ConnectorFormTestProvider, waitForComponentToUpdate } from '../lib/test_utils';
import { SlackActionFieldsComponents as SlackActionFields } from './slack_connectors';
import { useValidChannels } from './use_valid_channels';

const mockUseKibanaReturnValue = createStartServicesMock();
jest.mock('@kbn/triggers-actions-ui-plugin/public/common/lib/kibana', () => ({
  __esModule: true,
  useKibana: jest.fn(() => ({
    services: mockUseKibanaReturnValue,
  })),
}));
jest.mock('./use_valid_channels');

(useKibana as jest.Mock).mockImplementation(() => ({
  services: {
    docLinks: {
      links: {
        alerting: { slackApiAction: 'url' },
      },
    },
    notifications: {
      toasts: {
        addSuccess: jest.fn(),
        addDanger: jest.fn(),
      },
    },
  },
}));

const useValidChannelsMock = useValidChannels as jest.Mock;

describe('SlackActionFields renders', () => {
  const onSubmit = jest.fn();
  beforeEach(() => {
    useValidChannelsMock.mockClear();
    onSubmit.mockClear();
    jest.clearAllMocks();
    useValidChannelsMock.mockImplementation(() => ({
      channels: [],
      isLoading: false,
      resetChannelsToValidate: jest.fn(),
    }));
  });

  it('all connector fields is rendered for web_api type', async () => {
    const actionConnector = {
      secrets: {
        token: 'some token',
      },
      config: {},
      id: 'test',
      actionTypeId: '.slack',
      name: 'slack',
      isDeprecated: false,
    };

    render(
      <ConnectorFormTestProvider connector={actionConnector} onSubmit={onSubmit}>
        <SlackActionFields readOnly={false} isEdit={false} registerPreSubmitValidator={() => {}} />
      </ConnectorFormTestProvider>
    );

    expect(screen.getByTestId('secrets.token-input')).toBeInTheDocument();
    expect(screen.getByTestId('secrets.token-input')).toHaveValue('some token');
  });

  it('connector validation succeeds when connector config is valid for Web API type', async () => {
    const actionConnector = {
      secrets: {
        token: 'some token',
      },
      id: 'test',
      actionTypeId: '.slack',
      name: 'slack',
      config: {},
      isDeprecated: false,
    };

    // Simulate that user just type a channel ID
    useValidChannelsMock.mockImplementation(() => ({
      channels: ['my-channel'],
      isLoading: false,
      resetChannelsToValidate: jest.fn(),
    }));

    render(
      <ConnectorFormTestProvider connector={actionConnector} onSubmit={onSubmit}>
        <SlackActionFields readOnly={false} isEdit={false} registerPreSubmitValidator={() => {}} />
      </ConnectorFormTestProvider>
    );
    await waitForComponentToUpdate();
    act(() => {
      screen.getByTestId('form-test-provide-submit').click();
    });

    await waitFor(() => {
      expect(onSubmit).toBeCalledTimes(1);
      expect(onSubmit).toBeCalledWith({
        data: {
          secrets: {
            token: 'some token',
          },
          config: {
            allowedChannels: ['my-channel'],
          },
          id: 'test',
          actionTypeId: '.slack',
          name: 'slack',
          isDeprecated: false,
        },
        isValid: true,
      });
    });
  });

  it('connector validation should failed when allowedChannels is empty', async () => {
    const actionConnector = {
      secrets: {
        token: 'some token',
      },
      id: 'test',
      actionTypeId: '.slack',
      name: 'slack',
      config: {},
      isDeprecated: false,
    };

    render(
      <ConnectorFormTestProvider connector={actionConnector} onSubmit={onSubmit}>
        <SlackActionFields readOnly={false} isEdit={false} registerPreSubmitValidator={() => {}} />
      </ConnectorFormTestProvider>
    );
    await waitForComponentToUpdate();
    act(() => {
      screen.getByTestId('form-test-provide-submit').click();
    });

    await waitFor(() => {
      expect(onSubmit).toBeCalledTimes(1);
      expect(onSubmit).toBeCalledWith(expect.objectContaining({ isValid: false }));
    });
  });
});
