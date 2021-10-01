/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

const apmIndexConfigPaths = [
  ['xpack.apm.sourcemapIndices', 'apm_oss.sourcemapIndices'],
  ['xpack.apm.errorIndices', 'apm_oss.errorIndices'],
  ['xpack.apm.onboardingIndices', 'apm_oss.onboardingIndices'],
  ['xpack.apm.spanIndices', 'apm_oss.spanIndices'],
  ['xpack.apm.transactionIndices', 'apm_oss.transactionIndices'],
  ['xpack.apm.metricsIndices', 'apm_oss.metricsIndices'],
] as const;

type ApmIndexConfigsPaths = typeof apmIndexConfigPaths[number][0];
type ApmIndicesSavedObjectAttributes = Partial<{
  [Property in ApmIndexConfigsPaths]: string;
}>;
type DeprecatedApmIndexConfigsPaths = typeof apmIndexConfigPaths[number][1];
type DeprecatedApmIndicesSavedObjectAttributes = Partial<{
  [Property in DeprecatedApmIndexConfigsPaths]: string;
}>;

export function updateApmOssIndexPaths(
  attributes: DeprecatedApmIndicesSavedObjectAttributes
) {
  return apmIndexConfigPaths.reduce(
    (attrs, [configPath, deprecatedConfigPath]) => {
      const indexConfig: string | undefined = attributes[deprecatedConfigPath];
      if (indexConfig) {
        attrs[configPath] = indexConfig;
      }
      return attrs;
    },
    {} as ApmIndicesSavedObjectAttributes
  );
}
