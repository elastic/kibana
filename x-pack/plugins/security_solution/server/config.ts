/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Observable } from 'rxjs';
import { schema, TypeOf } from '@kbn/config-schema';
import { PluginInitializerContext } from '../../../../src/core/server';
import { SIGNALS_INDEX_KEY, DEFAULT_SIGNALS_INDEX } from '../common/constants';

export const configSchema = schema.object({
  enabled: schema.boolean({ defaultValue: true }),
  maxRuleImportExportSize: schema.number({ defaultValue: 10000 }),
  maxRuleImportPayloadBytes: schema.number({ defaultValue: 10485760 }),
  maxTimelineImportExportSize: schema.number({ defaultValue: 10000 }),
  maxTimelineImportPayloadBytes: schema.number({ defaultValue: 10485760 }),
  [SIGNALS_INDEX_KEY]: schema.string({ defaultValue: DEFAULT_SIGNALS_INDEX }),
  /**
   * Host Endpoint Configuration
   */
  endpointResultListDefaultFirstPageIndex: schema.number({ defaultValue: 0 }),
  endpointResultListDefaultPageSize: schema.number({ defaultValue: 10 }),

  /**
   * Alert Endpoint Configuration
   */
  alertResultListDefaultDateRange: schema.object({
    from: schema.string({ defaultValue: 'now-15m' }),
    to: schema.string({ defaultValue: 'now' }),
  }),
});

export const createConfig$ = (context: PluginInitializerContext) =>
  context.config.create<TypeOf<typeof configSchema>>();

export type ConfigType = ReturnType<typeof createConfig$> extends Observable<infer T>
  ? T
  : ReturnType<typeof createConfig$>;
