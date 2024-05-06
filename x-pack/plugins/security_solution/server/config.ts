/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TypeOf } from '@kbn/config-schema';
import { schema } from '@kbn/config-schema';
import type { PluginInitializerContext } from '@kbn/core/server';
import { SIGNALS_INDEX_KEY, DEFAULT_SIGNALS_INDEX } from '../common/constants';
import type { ExperimentalFeatures } from '../common/experimental_features';
import { parseExperimentalConfigValue } from '../common/experimental_features';
import { parseConfigSettings, type ConfigSettings } from '../common/config_settings';

/**
 * Validates if the value provided is a valid duration for use with Task Manager (ex. 5m, 4s)
 */
const isValidTaskManagerDuration = (value: string): string | undefined => {
  if (/^\d+[s,m]{1}$/.test(value)) {
    return `Invalid duration [${value}]. Value must be a number followed by either 's' for seconds or 'm' for minutes `;
  }
};

export const configSchema = schema.object({
  maxRuleImportExportSize: schema.number({ defaultValue: 10000 }),
  maxRuleImportPayloadBytes: schema.number({ defaultValue: 10485760 }),
  maxTimelineImportExportSize: schema.number({ defaultValue: 10000 }),
  maxTimelineImportPayloadBytes: schema.number({ defaultValue: 10485760 }),

  /**
   * This is used within the merge strategies:
   * server/lib/detection_engine/rule_types/utils/source_fields_merging
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
   * server/lib/detection_engine/rule_types/utils/source_fields_merging
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
  }),

  /**
   * Endpoint Artifacts Configuration: the interval between runs of the task that builds the
   * artifacts and associated manifest.
   */
  packagerTaskInterval: schema.string({ defaultValue: '60s' }),

  /**
   * Endpoint Artifacts Configuration: timeout value for how long the task should run.
   */
  packagerTaskTimeout: schema.string({ defaultValue: '20m' }),

  /**
   * Artifacts Configuration for package policy update concurrency
   */
  packagerTaskPackagePolicyUpdateBatchSize: schema.number({ defaultValue: 25, max: 50, min: 1 }),

  /**
   * Complete External Response Actions task: interval duration
   */
  completeExternalResponseActionsTaskInterval: schema.string({
    defaultValue: '60s',
    validate: isValidTaskManagerDuration,
  }),

  /**
   * Complete External Response Actions task: Timeout value for how long the task should run
   */
  completeExternalResponseActionsTaskTimeout: schema.string({
    defaultValue: '20m',
    validate: isValidTaskManagerDuration,
  }),

  /**
   * For internal use. Specify which version of the Detection Rules fleet package to install
   * when upgrading rules. If not provided, the latest compatible package will be installed,
   * or if running from a dev environment or -SNAPSHOT build, the latest pre-release package
   * will be used (if fleet is available or not within an airgapped environment).
   *
   * Note: This is for `upgrade only`, which occurs by means of the `useUpgradeSecurityPackages`
   * hook when navigating to a Security Solution page. The package version specified in
   * `fleet_packages.json` in project root will always be installed first on Kibana start if
   * the package is not already installed.
   */
  prebuiltRulesPackageVersion: schema.maybe(schema.string()),
  enabled: schema.boolean({ defaultValue: true }),
  enableUiSettingsValidations: schema.boolean({ defaultValue: false }),

  /**
   * The Max number of Bytes allowed for the `upload` endpoint response action
   */
  maxUploadResponseActionFileBytes: schema.number({
    defaultValue: 26214400, // 25MB,
    max: 104857600, // 100MB,
  }),
  /**
   * Defines the settings for a specific offering of the Security Solution app.
   * They override the default values.
   * @example
   * xpack.securitySolution.offeringSettings: {
   *  "ILMEnabled": false,
   * }
   */
  offeringSettings: schema.recordOf(schema.string(), schema.boolean(), {
    defaultValue: {},
  }),
  entityAnalytics: schema.object({
    riskEngine: schema.object({
      alertSampleSizePerShard: schema.number({ defaultValue: 10_000 }),
    }),
    assetCriticality: schema.object({
      csvUpload: schema.object({
        errorRetries: schema.number({ defaultValue: 1 }),
        maxBulkRequestBodySizeBytes: schema.number({ defaultValue: 100_000 }), // 100KB
      }),
    }),
  }),
});

export type ConfigSchema = TypeOf<typeof configSchema>;

export type ConfigType = Omit<ConfigSchema, 'offeringSettings'> & {
  experimentalFeatures: ExperimentalFeatures;
  settings: ConfigSettings;
  enableUiSettingsValidations: boolean;
};

export const createConfig = (context: PluginInitializerContext): ConfigType => {
  const pluginConfig = context.config.get<TypeOf<typeof configSchema>>();
  const logger = context.logger.get('config');

  const { invalid, features: experimentalFeatures } = parseExperimentalConfigValue(
    pluginConfig.enableExperimental
  );

  if (invalid.length) {
    logger.warn(`Unsupported "xpack.securitySolution.enableExperimental" values detected.
The following configuration values are no longer supported and should be removed from the kibana configuration file:

    xpack.securitySolution.enableExperimental:
${invalid.map((key) => `      - ${key}`).join('\n')}
`);
  }

  const { invalid: invalidConfigSettings, settings } = parseConfigSettings(
    pluginConfig.offeringSettings
  );

  if (invalidConfigSettings.length) {
    logger.warn(`Unsupported "xpack.securitySolution.offeringSettings" values detected.
The following configuration values are no longer supported and should be removed from the kibana configuration file:
${invalidConfigSettings.map((key) => `      - ${key}`).join('\n')}
`);
  }

  return {
    ...pluginConfig,
    experimentalFeatures,
    settings,
  };
};
