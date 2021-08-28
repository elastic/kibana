/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { TypeOf } from '@kbn/config-schema';
import { schema } from '@kbn/config-schema';
import type { PluginInitializerContext } from '../../../../src/core/server/plugins/types';
import type { ScopedAnnotationsClient } from './lib/annotations/bootstrap_annotations';
import type { ObservabilityPluginSetup } from './plugin';
import { ObservabilityPlugin } from './plugin';
import type { Mappings } from './utils/create_or_update_index';
import { createOrUpdateIndex } from './utils/create_or_update_index';
import { unwrapEsResponse, WrappedElasticsearchClientError } from './utils/unwrap_es_response';

export * from './types';
export { kqlQuery, rangeQuery } from './utils/queries';
export {
  createOrUpdateIndex,
  Mappings,
  ObservabilityPluginSetup,
  ScopedAnnotationsClient,
  unwrapEsResponse,
  WrappedElasticsearchClientError,
};

export const config = {
  exposeToBrowser: {
    unsafe: { alertingExperience: { enabled: true }, cases: { enabled: true } },
  },
  schema: schema.object({
    enabled: schema.boolean({ defaultValue: true }),
    annotations: schema.object({
      enabled: schema.boolean({ defaultValue: true }),
      index: schema.string({ defaultValue: 'observability-annotations' }),
    }),
    unsafe: schema.object({
      alertingExperience: schema.object({ enabled: schema.boolean({ defaultValue: false }) }),
      cases: schema.object({ enabled: schema.boolean({ defaultValue: false }) }),
    }),
  }),
};

export type ObservabilityConfig = TypeOf<typeof config.schema>;

export const plugin = (initContext: PluginInitializerContext) =>
  new ObservabilityPlugin(initContext);
