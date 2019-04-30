/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Joi from 'joi';

interface ConsoleParams {
  message: string;
}

export const consoleConnector = {
  id: 'console',
  validate: {
    params: Joi.object()
      .keys({
        message: Joi.string().required(),
      })
      .required(),
  },
  async executor(connectorOptions: any, { message }: ConsoleParams) {
    // eslint-disable-next-line no-console
    console.log(message);
  },
};
