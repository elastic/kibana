/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act, render, fireEvent, screen } from '@testing-library/react';
import { useKibana } from '@kbn/triggers-actions-ui-plugin/public';

import { ConnectorFormTestProvider, waitForComponentToUpdate } from '../lib/test_utils';
import SlackActionFields from './slack_connectors';
import { useFetchChannels } from './use_valid_channels';

jest.mock('@kbn/triggers-actions-ui-plugin/public/common/lib/kibana');
jest.mock('./use_fetch_channels');

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

(useFetchChannels as jest.Mock).mockImplementation(() => ({
  channels: [],
  isLoading: false,
}));

describe('SlackActionFields renders', () => {
  const onSubmit = jest.fn();
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('all connector fields is rendered for web_api type', async () => {
    const actionConnector = {
      secrets: {
        token: 'some token',
      },
      config: {
        allowedChannels: ['foo', 'bar'],
      },
      id: 'test',
      actionTypeId: '.slack',
      name: 'slack',
      isDeprecated: false,
    };

    const { container } = render(
      <ConnectorFormTestProvider connector={actionConnector} onSubmit={onSubmit}>
        <SlackActionFields readOnly={false} isEdit={false} registerPreSubmitValidator={() => {}} />
      </ConnectorFormTestProvider>
    );

    expect(screen.getByTestId('secrets.token-input')).toBeInTheDocument();
    expect(screen.getByTestId('secrets.token-input')).toHaveValue('some token');
    expect(screen.getByTestId('config.allowedChannels-input')).toBeInTheDocument();
    const allowedChannels: string[] = [];
    container
      .querySelectorAll('[data-test-subj="config.allowedChannels-input"] .euiBadge')
      .forEach((node) => {
        const channel = node.getAttribute('title');
        if (channel) {
          allowedChannels.push(channel);
        }
      });
    expect(allowedChannels).toEqual(['foo', 'bar']);
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

    render(
      <ConnectorFormTestProvider connector={actionConnector} onSubmit={onSubmit}>
        <SlackActionFields readOnly={false} isEdit={false} registerPreSubmitValidator={() => {}} />
      </ConnectorFormTestProvider>
    );
    await waitForComponentToUpdate();
    await act(async () => {
      fireEvent.click(screen.getByTestId('form-test-provide-submit'));
    });
    expect(onSubmit).toBeCalledTimes(1);
    expect(onSubmit).toBeCalledWith({
      data: {
        secrets: {
          token: 'some token',
        },
        config: {
          allowedChannels: [],
        },
        id: 'test',
        actionTypeId: '.slack',
        name: 'slack',
        isDeprecated: false,
      },
      isValid: true,
    });
  });

  it('Allowed Channels combobox should be disable when there is NO token', async () => {
    const actionConnector = {
      secrets: {
        token: '',
      },
      config: {
        allowedChannels: ['foo', 'bar'],
      },
      id: 'test',
      actionTypeId: '.slack',
      name: 'slack',
      isDeprecated: false,
    };

    const { container } = render(
      <ConnectorFormTestProvider connector={actionConnector} onSubmit={onSubmit}>
        <SlackActionFields readOnly={false} isEdit={false} registerPreSubmitValidator={() => {}} />
      </ConnectorFormTestProvider>
    );
    expect(
      container.querySelector(
        '[data-test-subj="config.allowedChannels-input"].euiComboBox-isDisabled'
      )
    ).toBeInTheDocument();
  });

  it('Allowed Channels combobox should NOT be disable when there is token', async () => {
    const actionConnector = {
      secrets: {
        token: 'qwertyuiopasdfghjklzxcvbnm',
      },
      config: {
        allowedChannels: ['foo', 'bar'],
      },
      id: 'test',
      actionTypeId: '.slack',
      name: 'slack',
      isDeprecated: false,
    };

    (useFetchChannels as jest.Mock).mockImplementation(() => ({
      channels: [{ label: 'foo' }, { label: 'bar' }, { label: 'hello' }, { label: 'world' }],
      isLoading: false,
    }));

    const { container } = render(
      <ConnectorFormTestProvider connector={actionConnector} onSubmit={onSubmit}>
        <SlackActionFields readOnly={false} isEdit={false} registerPreSubmitValidator={() => {}} />
      </ConnectorFormTestProvider>
    );

    expect(
      container.querySelector(
        '[data-test-subj="config.allowedChannels-input"].euiComboBox-isDisabled'
      )
    ).not.toBeInTheDocument();
  });
});
