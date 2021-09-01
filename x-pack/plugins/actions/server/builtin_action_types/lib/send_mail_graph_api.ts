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
import { SendEmailOptions, Transport } from './send_email';

interface PostMSExchangeSendEmailOptions {
  // POST /me/sendMail
  // POST /users/{id | userPrincipalName}/sendMail
  transport: Transport;
  emailOptions: SendEmailOptions;
  headers: Record<string, string>;
}

// post an event to pagerduty
export async function postSendEmailMSExchange(
  options: PostMSExchangeSendEmailOptions,
  logger: Logger,
  configurationUtilities: ActionsConfigurationUtilities
): Promise<AxiosResponse> {
  const { emailOptions, headers, transport } = options;

  const res: AxiosResponse<{ token_type: string; access_token: string }> = await postAuthToken(
    `https://login.microsoftonline.com/${transport.tenantId}/oauth2/v2.0/token`,
    {
      scope: 'https://graph.microsoft.com/.default',
      grant_type: 'client_credentials',
      client_id: transport.clientId,
      client_secret: transport.clientSecret,
    }
  );

  if (res.status === 200) {
    headers.Authorization = `${res.data.token_type} ${res.data.access_token}`;
  }

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

export async function postAuthToken(
  tokenUrl: string,
  obj: {
    scope?: string;
    client_id?: string;
    client_secret?: string;
    grant_type?: string;
  }
): Promise<AxiosResponse> {
  const axiosInstance = axios.create();
  return await axiosInstance(tokenUrl, {
    method: 'post',
    data: qs.stringify(obj),
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
    },
  });
}
