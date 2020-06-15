/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { PluginInitializer } from '../../../../src/core/server';
import { beatsManagementConfigSchema } from '../common';
import { BeatsManagementPlugin } from './plugin';

export const config = {
  schema: beatsManagementConfigSchema,

  exposeToBrowser: {
    defaultUserRoles: true,
    encryptionKey: true,
    enrollmentTokensTtlInSeconds: true,
  },
};

export const plugin: PluginInitializer<{}, {}> = (context) => new BeatsManagementPlugin(context);
