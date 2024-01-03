/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema, TypeOf } from '@kbn/config-schema';
import type { PluginConfigDescriptor, PluginInitializerContext } from '@kbn/core/server';

/**
 * These properties are used to create both the Collector and the Symbolizer integrations
 * when Universal Profiling is initialized.
 * As of now Universal Profiling is only available on Elastic Cloud, so
 * Elastic Cloud will fill these properties up and pass it to Kibana.
 * Note that the list of config options does not encompass all the avaiable entries
 * offered by the integrations pacakges, but are limited to the ones that
 * Cloud will make use of.
 */
const packageInputSchema = schema.object({
  host: schema.maybe(schema.string()),
  telemetry: schema.maybe(schema.boolean()),
  tls_enabled: schema.maybe(schema.boolean()),
  tls_supported_protocols: schema.maybe(schema.arrayOf(schema.string())),
  tls_certificate_path: schema.maybe(schema.string()),
  tls_key_path: schema.maybe(schema.string()),
});

const configSchema = schema.object({
  enabled: schema.boolean({ defaultValue: false }),
  symbolizer: schema.maybe(packageInputSchema),
  collector: schema.maybe(packageInputSchema),
  elasticsearch: schema.conditional(
    schema.contextRef('dist'),
    schema.literal(true),
    schema.never(),
    schema.maybe(
      schema.object({
        hosts: schema.string(),
        username: schema.string(),
        password: schema.string(),
      })
    )
  ),
});

export type ProfilingConfig = TypeOf<typeof configSchema>;
export type PackageInputType = TypeOf<typeof packageInputSchema>;

// plugin config
export const config: PluginConfigDescriptor<ProfilingConfig> = {
  schema: configSchema,
};

//  This exports static code and TypeScript types,
//  as well as, Kibana Platform `plugin()` initializer.

export async function plugin(initializerContext: PluginInitializerContext) {
  const { ProfilingPlugin } = await import('./plugin');
  return new ProfilingPlugin(initializerContext);
}

export type { ProfilingPluginSetup, ProfilingPluginStart } from './types';
