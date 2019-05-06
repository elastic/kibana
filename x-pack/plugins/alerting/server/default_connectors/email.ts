/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Joi from 'joi';
import nodemailer from 'nodemailer';

interface EmailConnectorOptions {
  port?: number;
  host: string;
  auth: {
    type?: string;
    username: string;
    password: string;
  };
}

interface EmailParams {
  from: string;
  to: string[];
  cc?: string[];
  bcc?: string[];
  subject: string;
  text: string;
  html?: string;
}

export const emailConnector = {
  id: 'email',
  name: 'E-mail',
  validate: {
    params: Joi.object()
      .keys({
        from: Joi.string().required(),
        to: Joi.array()
          .items(Joi.string())
          .min(1)
          .required(),
        cc: Joi.array()
          .items(Joi.string())
          .optional(),
        bcc: Joi.array()
          .items(Joi.string())
          .optional(),
        subject: Joi.string().required(),
        text: Joi.string().required(),
        html: Joi.strict().optional(),
      })
      .required(),
    connectorOptions: Joi.object()
      .keys({
        port: Joi.number().optional(),
        host: Joi.string().required(),
        auth: Joi.object()
          .keys({
            type: Joi.string().optional(),
            username: Joi.string().required(),
            password: Joi.string().required(),
          })
          .required(),
      })
      .required(),
  },
  async executor(connectorOptions: EmailConnectorOptions, params: EmailParams) {
    // @ts-ignore
    const transporter = nodemailer.createTransport(connectorOptions, {
      secure: true,
    });
    await transporter.sendMail(params);
  },
};
