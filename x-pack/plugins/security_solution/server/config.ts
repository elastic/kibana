/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema, TypeOf } from '@kbn/config-schema';
import { PluginInitializerContext } from '../../../../src/core/server';
import { SIGNALS_INDEX_KEY, DEFAULT_SIGNALS_INDEX } from '../common/constants';
import {
  getExperimentalAllowedValues,
  isValidExperimentalValue,
} from '../common/experimental_features';

const allowedExperimentalValues = getExperimentalAllowedValues();

export const configSchema = schema.object({
  enabled: schema.boolean({ defaultValue: true }),
  maxRuleImportExportSize: schema.number({ defaultValue: 10000 }),
  maxRuleImportPayloadBytes: schema.number({ defaultValue: 10485760 }),
  maxTimelineImportExportSize: schema.number({ defaultValue: 10000 }),
  maxTimelineImportPayloadBytes: schema.number({ defaultValue: 10485760 }),
  [SIGNALS_INDEX_KEY]: schema.string({ defaultValue: DEFAULT_SIGNALS_INDEX }),

  /**
   * For internal use. A list of string values (comma delimited) that will enable experimental
   * type of functionality that is not yet released. Valid values for this settings need to
   * be defined in:
   * `x-pack/plugins/security_solution/common/experimental_features.ts`
   * under the `allowedExperimentalValues` object
   *
   * @example
   * xpack.securitySolution.enableExperimental:
   *   - someCrazyFeature
   *   - trustedAppsByPolicyEnabled
   */
  enableExperimental: schema.arrayOf(schema.string(), {
    defaultValue: () => [],
    validate(list) {
      for (const key of list) {
        if (!isValidExperimentalValue(key)) {
          return `[${key}] is not allowed. Allowed values are: ${allowedExperimentalValues.join(
            ', '
          )}`;
        }
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
