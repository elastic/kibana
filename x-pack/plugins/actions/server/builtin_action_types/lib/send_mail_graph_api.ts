/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import axios, { AxiosResponse } from 'axios';
import { Logger } from '../../../../../../src/core/server';
import { request } from './axios_utils';
import { ActionsConfigurationUtilities } from '../../actions_config';
import { SendEmailOptions } from './send_email';

interface PostMSExchangeSendEmailOptions {
  // POST /me/sendMail
  // POST /users/{id | userPrincipalName}/sendMail
  emailOptions: SendEmailOptions;
  headers: Record<string, string>;
}

// post an event to pagerduty
export async function postSendEmailMSExchange(
  options: PostMSExchangeSendEmailOptions,
  logger: Logger,
  configurationUtilities: ActionsConfigurationUtilities
): Promise<AxiosResponse> {
  const { emailOptions, headers } = options;
  const axiosInstance = axios.create();

  return await request({
    axios: axiosInstance,
    url: 'https://graph.microsoft.com/v1.0/me/sendMail',
    method: 'post',
    logger,
    data: getMessage(emailOptions),
    headers,
    configurationUtilities,
    validateStatus: () => true,
  });
}

function getMessage(emailOptions: SendEmailOptions) {
  const { transport, routing, content, configurationUtilities, hasAuth, provider } = emailOptions;
  const { accessToken } = transport;
  const { from, to, cc, bcc } = routing;
  const { subject, message } = content;
  return {
    data: {
      message: {
        subject,
        body: {
          contentType: 'HTML',
          content: message,
        },
        toRecipients: [
          {
            emailAddress: {
              address: to,
            },
          },
        ],
        ccRecipients: [
          {
            emailAddress: {
              address: cc,
            },
          },
        ],
      },
    },
  };
}
