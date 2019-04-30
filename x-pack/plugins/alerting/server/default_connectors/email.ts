/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import nodemailer, { SendMailOptions } from 'nodemailer';

export const emailConnector = {
  id: 'email',
  async executor(connectorOptions: any, params: SendMailOptions) {
    const transporter = nodemailer.createTransport(connectorOptions);
    await transporter.sendMail(params);
  },
};
