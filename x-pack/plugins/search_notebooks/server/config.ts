/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema, TypeOf } from '@kbn/config-schema';
import { PluginConfigDescriptor } from '@kbn/core/server';

export * from './types';

const configSchema = schema.object({
  enabled: schema.boolean({ defaultValue: false }),
});

type SearchNotebooksSchema = TypeOf<typeof configSchema>;

export const config: PluginConfigDescriptor<SearchNotebooksSchema> = {
  schema: configSchema,
};

export type SearchNotebooksConfig = TypeOf<typeof configSchema>;
