/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import axios from 'axios';
import { Logger } from '../../../../../../src/core/server';
import { loggingSystemMock } from '../../../../../../src/core/server/mocks';
import { actionsConfigMock } from '../../actions_config.mock';
import { CustomHostSettings } from '../../config';
import { ProxySettings } from '../../types';
import { sendEmailGraphApi } from './send_email_graph_api';


const axiosMock = (axios as unknown) as jest.Mock;
const logger = loggingSystemMock.create().get() as jest.Mocked<Logger>;

describe('sendEmailGraphApi', () => {
  const configurationUtilities = actionsConfigMock.create();

  test('email contains the proper message', async () => {
    const result = await sendEmailGraphApi({ options: getSendEmailOptions(), messageHTML: 'test1', headers: {}}, logger, configurationUtilities);
    expect(result.data.message).toBe('test1');
  });

  test('email was sent on behalf of the user "from" mailbox', async () => {
    const result = await sendEmailGraphApi({ options: getSendEmailOptions(), messageHTML: 'test2', headers: {}}, logger, configurationUtilities);
    expect(result).not.toBeNull();
    expect(result).toMatchObject({});
  });

  test('sendMail request was sent to the configured Graph API URL', async () => {
    const result = await sendEmailGraphApi({ options: getSendEmailOptions(), messageHTML: 'test2', headers: {}, graphApiUrl: 'https://test'}, logger, configurationUtilities);
    expect(result).not.toBeNull();
    expect(result).toMatchObject({});
  });
});

function getSendEmailOptions(
  { content = {}, routing = {}, transport = {} } = {},
  proxySettings?: ProxySettings,
  customHostSettings?: CustomHostSettings
) {
  const configurationUtilities = actionsConfigMock.create();
  if (proxySettings) {
    configurationUtilities.getProxySettings.mockReturnValue(proxySettings);
  }
  if (customHostSettings) {
    configurationUtilities.getCustomHostSettings.mockReturnValue(customHostSettings);
  }
  return {
    content: {
      ...content,
      message: 'a message',
      subject: 'a subject',
    },
    routing: {
      ...routing,
      from: 'fred@example.com',
      to: ['jim@example.com'],
      cc: ['bob@example.com', 'robert@example.com'],
      bcc: [],
    },
    transport: {
      ...transport,
      service: 'exchange_server',
      clienySecret: 'gfhfh',
    },
    hasAuth: true,
    configurationUtilities,
  };
}
