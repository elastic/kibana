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

const defaultPageSizeSchema = schema.number({ defaultValue: 10 });
const defaultFirstPageSchema = schema.number({ defaultValue: 0 });

export const EndpointConfigSchema = schema.object({
  enabled: schema.boolean({ defaultValue: false }),
  endpointResultListDefaultFirstPageIndex: defaultFirstPageSchema,
  endpointResultListDefaultPageSize: defaultPageSizeSchema,
  resolverResultListDefaultFirstPageIndex: defaultFirstPageSchema,
  resolverResultListDefaultPageSize: defaultPageSizeSchema,
  alertResultListDefaultFirstPageIndex: defaultFirstPageSchema,
  alertResultListDefaultPageSize: defaultPageSizeSchema,
});

export function createConfig$(context: PluginInitializerContext) {
  return context.config.create<TypeOf<typeof EndpointConfigSchema>>();
}
