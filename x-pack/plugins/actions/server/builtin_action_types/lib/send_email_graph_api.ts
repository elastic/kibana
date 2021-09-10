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

interface SendEmailGraphApiOptions {
  options: SendEmailOptions;
  headers: Record<string, string>;
  messageHTML: string;
}

export async function sendEmailGraphApi(
  sendEmailOptions: SendEmailGraphApiOptions,
  logger: Logger,
  configurationUtilities: ActionsConfigurationUtilities
): Promise<AxiosResponse> {
  const { options, headers, messageHTML } = sendEmailOptions;

  const axiosInstance = axios.create();

  // POST /users/{id | userPrincipalName}/sendMail
  return await request({
    axios: axiosInstance,
    url: `https://graph.microsoft.com/v1.0/users/${options.routing.from}/sendMail`,
    method: 'post',
    logger,
    data: getMessage(options, messageHTML),
    headers,
    configurationUtilities,
    validateStatus: () => true,
  });
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
