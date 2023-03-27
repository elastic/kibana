/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { ActionParamsProps } from '@kbn/triggers-actions-ui-plugin/public';
import { SlackWebApiParamsFields } from './slack_web_api_params';
import { SlackWebhookParamsFields } from './slack_webhook_params';
import { WebhookParams, PostMessageParams } from '../../../common/slack/types';
import type { SlackActionConnector } from './types';

const SlackParamsFields: React.FunctionComponent<
  ActionParamsProps<WebhookParams | PostMessageParams>
> = (props) => {
  const { actionConnector } = props;
  const slackType = (actionConnector as unknown as SlackActionConnector)?.config?.type;

  return (
    <>
      {!slackType || slackType === 'webhook' ? <SlackWebhookParamsFields {...props} /> : null}
      {slackType === 'web_api' ? <SlackWebApiParamsFields {...props} /> : null}
    </>
  );
};

// eslint-disable-next-line import/no-default-export
export { SlackParamsFields as default };
