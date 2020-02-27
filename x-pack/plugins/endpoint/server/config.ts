/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { schema, TypeOf } from '@kbn/config-schema';
import { Observable } from 'rxjs';
import { PluginInitializerContext } from 'kibana/server';

export type EndpointConfigType = ReturnType<typeof createConfig$> extends Observable<infer P>
  ? P
  : ReturnType<typeof createConfig$>;

export const EndpointConfigSchema = schema.object({
  enabled: schema.boolean({ defaultValue: false }),

  /**
   * Host Configuration
   */
  endpointResultListDefaultFirstPageIndex: schema.number({ defaultValue: 0 }),
  endpointResultListDefaultPageSize: schema.number({ defaultValue: 10 }),

  /**
   * Alert Configuration
   */
  alertResultListDefaultDateRange: schema.object({
    from: schema.string({ defaultValue: 'now-15m' }),
    to: schema.string({ defaultValue: 'now' }),
  }),
});

export function createConfig$(context: PluginInitializerContext) {
  return context.config.create<TypeOf<typeof EndpointConfigSchema>>();
}
