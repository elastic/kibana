/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema, type TypeOf } from '@kbn/config-schema';
import type { PluginConfigDescriptor, PluginInitializerContext } from '@kbn/core/server';
import type { SecuritySolutionPluginSetup } from '@kbn/security-solution-plugin/server/plugin_contract';
import { productTypes } from '../common/config';
import type { ExperimentalFeatures } from '../common/experimental_features';
import { parseExperimentalConfigValue } from '../common/experimental_features';

export const configSchema = schema.object({
  enabled: schema.boolean({ defaultValue: false }),
  productTypes,
  /**
   * For internal use. A list of string values (comma delimited) that will enable experimental
   * type of functionality that is not yet released. Valid values for this settings need to
   * be defined in:
   * `x-pack/plugins/security_solution_serverless/common/experimental_features.ts`
   * under the `allowedExperimentalValues` object
   *
   * @example
   * xpack.securitySolutionServerless.enableExperimental:
   *   - someCrazyServerlessFeature
   *   - someEvenCrazierServerlessFeature
   */
  enableExperimental: schema.arrayOf(schema.string(), {
    defaultValue: () => [],
  }),
});
export type ServerlessSecuritySchema = TypeOf<typeof configSchema>;

export const config: PluginConfigDescriptor<ServerlessSecuritySchema> = {
  exposeToBrowser: {
    enableExperimental: true,
    productTypes: true,
  },
  schema: configSchema,
  deprecations: ({ renameFromRoot }) => [
    renameFromRoot(
      'xpack.serverless.security.productTypes',
      'xpack.securitySolutionServerless.productTypes',
      { silent: true, level: 'warning' }
    ),
  ],
};

export type ServerlessSecurityConfig = Omit<ServerlessSecuritySchema, 'enableExperimental'> & {
  experimentalFeatures: ExperimentalFeatures;
};

export const createConfig = (
  context: PluginInitializerContext,
  securitySolution: SecuritySolutionPluginSetup
): ServerlessSecurityConfig => {
  const { enableExperimental, ...pluginConfig } = context.config.get<ServerlessSecuritySchema>();
  const logger = context.logger.get('config');

  const {
    invalid,
    duplicated,
    features: experimentalFeatures,
  } = parseExperimentalConfigValue(enableExperimental, securitySolution.experimentalFeatures);

  if (invalid.length) {
    logger.warn(`Unsupported "xpack.securitySolutionServerless.enableExperimental" values detected.
The following configuration values are not supported and should be removed from the configuration:

    xpack.securitySolutionServerless.enableExperimental:
${invalid.map((key) => `      - ${key}`).join('\n')}
`);
  }

  if (duplicated.length) {
    logger.warn(`Duplicated "xpack.securitySolutionServerless.enableExperimental" values detected.
The following configuration values are should only be defined using the generic "xpack.securitySolution.enableExperimental":

    xpack.securitySolutionServerless.enableExperimental:
${duplicated.map((key) => `      - ${key}`).join('\n')}
`);
  }

  return {
    ...pluginConfig,
    experimentalFeatures,
  };
};
