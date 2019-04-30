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

interface DefaulParams {
  command: string;
}

interface PostMessageParams extends DefaulParams {
  command: 'post-message';
  message: string;
  channel: string;
}

type SlackParams = PostMessageParams | DefaulParams;

export const slackConnector = {
  id: 'slack',
  validate: {
    params: Joi.alternatives()
      .try(
        Joi.object()
          .keys({
            command: Joi.string().valid('post-message'),
            message: Joi.string().required(),
            channel: Joi.string().required(),
          })
          .required()
      )
      .required(),
    connectorOptions: Joi.object()
      .keys({
        token: Joi.string().required(),
      })
      .required(),
  },
  async executor(connectorOptions: SlackConnectorOptions, params: SlackParams) {
    switch (params.command) {
      case 'post-message':
        await slack.chat.postMessage({
          token: connectorOptions.token,
          text: (params as PostMessageParams).message,
          channel: (params as PostMessageParams).channel,
        });
        break;
      default:
        throw new Error(`Unsupported command "${params.command}".`);
    }
  },
};
