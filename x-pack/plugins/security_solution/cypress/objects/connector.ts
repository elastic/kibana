/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface EmailConnector {
  name: string;
  from: string;
  host: string;
  port: string;
  user: string;
  password: string;
  service: string;
}

export const getEmailConnector = (): EmailConnector => ({
  name: 'Test connector',
  from: 'test@example.com',
  host: 'example.com',
  port: '80',
  user: 'username',
  password: 'password',
  service: 'Other',
});
