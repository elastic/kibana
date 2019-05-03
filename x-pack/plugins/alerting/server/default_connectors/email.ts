/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import nodemailer from 'nodemailer';

export const emailConnector = {
  id: 'email',
  name: 'E-mail',
  async executor(connectorOptions: any, params: any) {
    const transporter = nodemailer.createTransport(connectorOptions);
    await transporter.sendMail(params);
  },
};
