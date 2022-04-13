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
  ExperimentalFeatures,
  getExperimentalAllowedValues,
  isValidExperimentalValue,
  parseExperimentalConfigValue,
} from '../common/experimental_features';

const allowedExperimentalValues = getExperimentalAllowedValues();

export const configSchema = schema.object({
  maxRuleImportExportSize: schema.number({ defaultValue: 10000 }),
  maxRuleImportPayloadBytes: schema.number({ defaultValue: 10485760 }),
  maxTimelineImportExportSize: schema.number({ defaultValue: 10000 }),
  maxTimelineImportPayloadBytes: schema.number({ defaultValue: 10485760 }),

  /**
   * This is used within the merge strategies:
   * server/lib/detection_engine/signals/source_fields_merging
   *
   * For determining which strategy for merging "fields" and "_source" together to get
   * runtime fields, constant keywords, etc...
   *
   * "missingFields" (default) This will only merge fields that are missing from the _source and exist in the fields.
   * "noFields" This will turn off all merging of runtime fields, constant keywords from fields.
   * "allFields" This will merge and overwrite anything found within "fields" into "_source" before indexing the data.
   */
  alertMergeStrategy: schema.oneOf(
    [schema.literal('allFields'), schema.literal('missingFields'), schema.literal('noFields')],
    {
      defaultValue: 'missingFields',
    }
  ),

  /**
   * This is used within the merge strategies:
   * server/lib/detection_engine/signals/source_fields_merging
   *
   * For determining if we need to ignore particular "fields" and not merge them with "_source" such as
   * runtime fields, constant keywords, etc...
   *
   * This feature and functionality is mostly as "safety feature" meaning that we have had bugs in the past
   * where something down the stack unexpectedly ends up in the fields API which causes documents to not
   * be indexable. Rather than changing alertMergeStrategy to be "noFields", you can use this array to add
   * any problematic values.
   *
   * You can use plain dotted notation strings such as "host.name" or a regular expression such as "/host\..+/"
   */
  alertIgnoreFields: schema.arrayOf(schema.string(), {
    defaultValue: [],
    validate(ignoreFields) {
      const errors = ignoreFields.flatMap((ignoreField, index) => {
        if (ignoreField.startsWith('/') && ignoreField.endsWith('/')) {
          try {
            new RegExp(ignoreField.slice(1, -1));
            return [];
          } catch (error) {
            return [`"${error.message}" at array position ${index}`];
          }
        } else {
          return [];
        }
      });
      if (errors.length !== 0) {
        return errors.join('. ');
      } else {
        return undefined;
      }
    },
  }),
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
   *   - someEvenCrazierFeature
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
   * Artifacts Configuration
   */
  packagerTaskInterval: schema.string({ defaultValue: '60s' }),

  /**
   * Detection prebuilt rules
   */
  prebuiltRulesFromFileSystem: schema.boolean({ defaultValue: true }),
  prebuiltRulesFromSavedObjects: schema.boolean({ defaultValue: true }),
});

export type ConfigSchema = TypeOf<typeof configSchema>;

export type ConfigType = ConfigSchema & {
  experimentalFeatures: ExperimentalFeatures;
};

export const createConfig = (context: PluginInitializerContext): ConfigType => {
  const pluginConfig = context.config.get<TypeOf<typeof configSchema>>();
  const experimentalFeatures = parseExperimentalConfigValue(pluginConfig.enableExperimental);

  return {
    ...pluginConfig,
    experimentalFeatures,
  };
};
