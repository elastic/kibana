/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { schema, TypeOf } from '@kbn/config-schema';
import { PluginInitializerContext } from 'kibana/server';
import { Observable } from 'rxjs';

export type EndpointConfigType = ReturnType<typeof createConfig$> extends Observable<infer P>
  ? P
  : ReturnType<typeof createConfig$>;

export const EndpointConfigSchema = schema.object({
  searchResultDefaultFirstPageIndex: schema.number({ defaultValue: 0 }),
  searchResultDefaultPageSize: schema.number({ defaultValue: 10 }),
});

export function createConfig$(context: PluginInitializerContext) {
  return context.config.create<TypeOf<typeof EndpointConfigSchema>>();
}
