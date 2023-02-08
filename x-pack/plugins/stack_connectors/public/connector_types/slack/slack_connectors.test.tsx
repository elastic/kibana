/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act, render, fireEvent, screen } from '@testing-library/react';
import SlackActionFields from './slack_connectors';
import { ConnectorFormTestProvider, waitForComponentToUpdate } from '../lib/test_utils';
import userEvent from '@testing-library/user-event';

jest.mock('@kbn/triggers-actions-ui-plugin/public/common/lib/kibana');

describe('SlackActionFields renders', () => {
  const onSubmit = jest.fn();
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('all connector fields is rendered for webhook type', async () => {
    const actionConnector = {
      secrets: {
        webhookUrl: 'http://test.com',
      },
      id: 'test',
      actionTypeId: '.slack',
      name: 'slack',
      config: {},
      isDeprecated: false,
    };

    render(
      <ConnectorFormTestProvider connector={actionConnector}>
        <SlackActionFields readOnly={false} isEdit={false} registerPreSubmitValidator={() => {}} />
      </ConnectorFormTestProvider>
    );

    fireEvent.click(screen.getByTestId('webhook'));
    expect(screen.getByTestId('slackWebhookUrlInput')).toBeInTheDocument();
    expect(screen.getByTestId('slackWebhookUrlInput')).toHaveValue('http://test.com');
  });

  it('all connector fields is rendered for web_api type', async () => {
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

    expect(screen.getByTestId('slackTypeChangeButton')).toBeInTheDocument();
    expect(screen.getByTestId('secrets.token-input')).toBeInTheDocument();
    expect(screen.getByTestId('secrets.token-input')).toHaveValue('some token');
  });

  it('should not show slack type tabs when in editing mode', async () => {
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
        <SlackActionFields readOnly={false} isEdit={true} registerPreSubmitValidator={() => {}} />
      </ConnectorFormTestProvider>
    );

    expect(screen.queryByTestId('slackTypeChangeButton')).not.toBeInTheDocument();
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
          type: 'web_api',
        },
        id: 'test',
        actionTypeId: '.slack',
        name: 'slack',
        isDeprecated: false,
      },
      isValid: true,
    });
  });

  it('connector validation succeeds when connector config is valid for Webhook type', async () => {
    const actionConnector = {
      secrets: {
        webhookUrl: 'http://test.com',
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
    fireEvent.click(screen.getByTestId('webhook'));

    await act(async () => {
      fireEvent.click(screen.getByTestId('form-test-provide-submit'));
    });

    expect(onSubmit).toBeCalledTimes(1);
    expect(onSubmit).toBeCalledWith({
      data: {
        secrets: {
          webhookUrl: 'http://test.com',
        },
        config: {
          type: 'webhook',
        },
        id: 'test',
        actionTypeId: '.slack',
        name: 'slack',
        isDeprecated: false,
      },
      isValid: true,
    });
  });

  it('validates teh web hook url field correctly', async () => {
    const actionConnector = {
      secrets: {},
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
    fireEvent.click(screen.getByTestId('webhook'));

    await userEvent.type(
      screen.getByTestId('slackWebhookUrlInput'),
      `{selectall}{backspace}no-valid`,
      {
        delay: 10,
      }
    );

    await act(async () => {
      fireEvent.click(screen.getByTestId('form-test-provide-submit'));
    });

    expect(onSubmit).toHaveBeenCalledWith({ data: {}, isValid: false });
  });
});
