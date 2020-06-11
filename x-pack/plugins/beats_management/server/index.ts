/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { beatsManagementConfigSchema } from '../common';

export const config = {
  schema: beatsManagementConfigSchema,

  exposeToBrowser: {
    defaultUserRoles: true,
    encryptionKey: true,
    enrollmentTokensTtlInSeconds: true,
  },
};

export const plugin = () => ({
  setup() {},
  start() {},
  stop() {},
});
