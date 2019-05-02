/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Joi from 'joi';
import slack from 'slack';

interface SlackConnectorOptions {
  token: string;
}

interface MessageSlackParams {
  message: string;
  channel: string;
}

export const messageSlackConnector = {
  id: 'message-slack',
  validate: {
    params: Joi.object()
      .keys({
        message: Joi.string().required(),
        channel: Joi.string().required(),
      })
      .required(),
    connectorOptions: Joi.object()
      .keys({
        token: Joi.string().required(),
      })
      .required(),
  },
  async executor(connectorOptions: SlackConnectorOptions, params: MessageSlackParams) {
    await slack.chat.postMessage({
      token: connectorOptions.token,
      text: params.message,
      channel: params.channel,
    });
  },
};
