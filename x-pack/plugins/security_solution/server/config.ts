/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema, TypeOf } from '@kbn/config-schema';
import { PluginInitializerContext } from '../../../../src/core/server';
import { SIGNALS_INDEX_KEY, DEFAULT_SIGNALS_INDEX } from '../common/constants';
import { parseExperimentalConfigValue } from '../common/experimental_features';

export const configSchema = schema.object({
  enabled: schema.boolean({ defaultValue: true }),
  maxRuleImportExportSize: schema.number({ defaultValue: 10000 }),
  maxRuleImportPayloadBytes: schema.number({ defaultValue: 10485760 }),
  maxTimelineImportExportSize: schema.number({ defaultValue: 10000 }),
  maxTimelineImportPayloadBytes: schema.number({ defaultValue: 10485760 }),
  [SIGNALS_INDEX_KEY]: schema.string({ defaultValue: DEFAULT_SIGNALS_INDEX }),

  /** Fleet server integration */
  fleetServerEnabled: schema.boolean({ defaultValue: false }),

  /**
   * For internal use. A list of string values that will enable experimental type of functionality that is
   * not yet released. Valid values for this settings need to be defined in:
   * `x-pack/plugins/security_solution/common/experimental_features.ts`
   * under the `allowedExperimentalValues` object
   */
  enableExperimental: schema.string({
    defaultValue: '',
    validate(value) {
      try {
        parseExperimentalConfigValue(value);
      } catch (e) {
        return e.message;
      }
    },
  }),

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

  /**
   * Artifacts Configuration
   */
  packagerTaskInterval: schema.string({ defaultValue: '60s' }),
  validateArtifactDownloads: schema.boolean({ defaultValue: true }),
});

export const createConfig = (context: PluginInitializerContext) =>
  context.config.get<TypeOf<typeof configSchema>>();

export type ConfigType = TypeOf<typeof configSchema>;
