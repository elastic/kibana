/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PluginConfigDescriptor } from '@kbn/core/server';
import { configSchema, type ConnectorsEmailConfigType } from './connectors_email_config';

export type NotificationsConfigType = ConnectorsEmailConfigType;

export const config: PluginConfigDescriptor<ConnectorsEmailConfigType> = {
  schema: configSchema,
};
