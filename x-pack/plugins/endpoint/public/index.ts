/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { PluginInitializer } from 'kibana/public';
import { schema } from '@kbn/config-schema';
import { EndpointPlugin } from './plugin';

export const config = {
  schema: schema.object({ enabled: schema.boolean({ defaultValue: false }) }),
};

export const plugin: PluginInitializer<{}, {}> = () => new EndpointPlugin();
