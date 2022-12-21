/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Observable } from 'rxjs';

import type { TypeOf } from '@kbn/config-schema';
import { schema } from '@kbn/config-schema';
import type { PluginInitializerContext } from '@kbn/core/server';

export const ConfigSchema = schema.object({
  maxSpaces: schema.number({ defaultValue: 1000 }),
});

export function createConfig$(context: PluginInitializerContext) {
  return context.config.create<TypeOf<typeof ConfigSchema>>();
}
export type ConfigType = ReturnType<typeof createConfig$> extends Observable<infer P>
  ? P
  : ReturnType<typeof createConfig$>;
