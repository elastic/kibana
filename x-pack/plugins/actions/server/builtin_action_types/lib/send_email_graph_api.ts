/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// @ts-expect-error missing type def
import stringify from 'json-stringify-safe';
import axios, { AxiosResponse } from 'axios';
import { Logger } from '@kbn/core/server';
import { request } from './axios_utils';
import { ActionsConfigurationUtilities } from '../../actions_config';
import { SendEmailOptions } from './send_email';

interface SendEmailGraphApiOptions {
  options: SendEmailOptions;
  headers: Record<string, string>;
  messageHTML: string;
  graphApiUrl?: string;
}

const MICROSOFT_GRAPH_API_HOST = 'https://graph.microsoft.com/v1.0';

export async function sendEmailGraphApi(
  sendEmailOptions: SendEmailGraphApiOptions,
  logger: Logger,
  configurationUtilities: ActionsConfigurationUtilities
): Promise<AxiosResponse> {
  const { options, headers, messageHTML, graphApiUrl } = sendEmailOptions;

  const axiosInstance = axios.create();

  // POST /users/{id | userPrincipalName}/sendMail
  const res = await request({
    axios: axiosInstance,
    url: `${graphApiUrl ?? MICROSOFT_GRAPH_API_HOST}/users/${options.routing.from}/sendMail`,
    method: 'post',
    logger,
    data: getMessage(options, messageHTML),
    headers,
    configurationUtilities,
    validateStatus: () => true,
  });
  if (res.status === 202) {
    return res.data;
  }
  const errString = stringify(res.data);
  logger.warn(
    `error thrown sending Microsoft Exchange email for clientID: ${sendEmailOptions.options.transport.clientId}: ${errString}`
  );
  throw new Error(errString);
}

function getMessage(emailOptions: SendEmailOptions, messageHTML: string) {
  const { routing, content } = emailOptions;
  const { to, cc, bcc } = routing;
  const { subject } = content;
  return {
    message: {
      subject,
      body: {
        contentType: 'HTML',
        content: messageHTML,
      },
      toRecipients: to.map((toAddr) => ({
        emailAddress: {
          address: toAddr,
        },
      })),
      ccRecipients: cc.map((ccAddr) => ({
        emailAddress: {
          address: ccAddr,
        },
      })),
      bccRecipients: bcc.map((bccAddr) => ({
        emailAddress: {
          address: bccAddr,
        },
      })),
    },
  };
}
