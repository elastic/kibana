/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Joi from 'joi';
import { IncomingWebhook, IncomingWebhookResult } from '@slack/webhook';

import { ActionType, ExecutorOptions } from '../action_type_registry';

class MockIncomingWebhook extends IncomingWebhook {
  async send(message: string): Promise<IncomingWebhookResult> {
    if (message == null) throw new Error('message property required in parameter');

    const failureMatch = message.match(/^failure: (.*)$/);
    if (failureMatch != null) {
      const failMessage = failureMatch[1];
      throw new Error(`mockIncomingWebhook failure: ${failMessage}`);
    }

    return {
      text: `mockIncomingWebhook success: ${message}`,
    };
  }
}

let UsedIncomingWebhook = IncomingWebhook;

export function useMockIncomingWebhook(useMock: boolean) {
  if (useMock === true) {
    UsedIncomingWebhook = MockIncomingWebhook;
    return;
  }

  UsedIncomingWebhook = IncomingWebhook;
}

const CONFIG_SCHEMA = Joi.object().keys({
  webhookUrl: Joi.string().required(),
});

const PARAMS_SCHEMA = Joi.object().keys({
  message: Joi.string().required(),
});

export const actionType: ActionType = {
  id: 'kibana.slack',
  name: 'slack',
  validate: {
    params: PARAMS_SCHEMA,
    actionTypeConfig: CONFIG_SCHEMA,
  },
  executor,
};

async function executor({ actionTypeConfig, params, services }: ExecutorOptions): Promise<any> {
  const { webhookUrl } = actionTypeConfig;
  const { message } = params;

  // TODO: do we need an agent for proxy access?
  const webhook = new UsedIncomingWebhook(webhookUrl);

  // TODO: should we have a standardize response for executor?
  return await webhook.send(message);
}
