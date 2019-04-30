/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import slack from 'slack';

interface SlackConnectorOptions {
  token: string;
}

interface DefaulParams {
  command: string;
}

interface PostMessageParams extends DefaulParams {
  command: 'post-message';
  message: string;
  channel: string;
}

type SlackParams = PostMessageParams;

export const slackConnector = {
  id: 'slack',
  async executor(connectorOptions: SlackConnectorOptions, params: SlackParams) {
    switch (params.command) {
      case 'post-message':
        await slack.chat.postMessage({
          token: connectorOptions.token,
          text: params.message,
          channel: params.channel,
        });
        break;
      default:
        throw new Error(`Unsupported command "${params.command}".`);
    }
  },
};
