/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// TODO: https://github.com/elastic/kibana/issues/110905
/* eslint-disable @kbn/eslint/no_export_all */

import { schema, TypeOf } from '@kbn/config-schema';
import { PluginConfigDescriptor, PluginInitializerContext } from '@kbn/core/server';
import { ObservabilityPlugin, ObservabilityPluginSetup } from './plugin';
import { createOrUpdateIndex, Mappings } from './utils/create_or_update_index';
import { createOrUpdateIndexTemplate } from './utils/create_or_update_index_template';
import { ScopedAnnotationsClient } from './lib/annotations/bootstrap_annotations';
import {
  unwrapEsResponse,
  WrappedElasticsearchClientError,
} from '../common/utils/unwrap_es_response';

export { rangeQuery, kqlQuery, termQuery, termsQuery } from './utils/queries';
export { getParsedFilterQuery } from './utils/get_parsed_filtered_query';
export { getInspectResponse } from '../common/utils/get_inspect_response';

export * from './types';

const configSchema = schema.object({
  annotations: schema.object({
    enabled: schema.boolean({ defaultValue: true }),
    index: schema.string({ defaultValue: 'observability-annotations' }),
  }),
  unsafe: schema.object({
    alertDetails: schema.object({
      metrics: schema.object({
        enabled: schema.boolean({ defaultValue: false }),
      }),
      logs: schema.object({
        // Enable it by default: https://github.com/elastic/kibana/issues/159945
        enabled: schema.boolean({ defaultValue: true }),
      }),
      uptime: schema.object({
        enabled: schema.boolean({ defaultValue: false }),
      }),
      observability: schema.object({
        enabled: schema.boolean({ defaultValue: false }),
      }),
    }),
    thresholdRule: schema.object({
      enabled: schema.boolean({ defaultValue: false }),
    }),
  }),
  thresholdRule: schema.object({
    groupByPageSize: schema.number({ defaultValue: 10_000 }),
  }),
  enabled: schema.boolean({ defaultValue: true }),
  compositeSlo: schema.object({
    enabled: schema.boolean({ defaultValue: false }),
  }),
});

export const config: PluginConfigDescriptor = {
  exposeToBrowser: {
    unsafe: true,
    aiAssistant: {
      enabled: true,
      feedback: {
        enabled: true,
      },
    },
  },
  schema: configSchema,
};

export type ObservabilityConfig = TypeOf<typeof configSchema>;

export const plugin = (initContext: PluginInitializerContext) =>
  new ObservabilityPlugin(initContext);

export type { Mappings, ObservabilityPluginSetup, ScopedAnnotationsClient };
export {
  createOrUpdateIndex,
  createOrUpdateIndexTemplate,
  unwrapEsResponse,
  WrappedElasticsearchClientError,
};

export { uiSettings } from './ui_settings';
