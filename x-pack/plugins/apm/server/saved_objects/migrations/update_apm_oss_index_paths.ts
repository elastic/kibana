/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

const apmIndexConfigs = [
  ['sourcemap', 'apm_oss.sourcemapIndices'],
  ['error', 'apm_oss.errorIndices'],
  ['onboarding', 'apm_oss.onboardingIndices'],
  ['span', 'apm_oss.spanIndices'],
  ['transaction', 'apm_oss.transactionIndices'],
  ['metric', 'apm_oss.metricsIndices'],
] as const;

type ApmIndexConfigs = typeof apmIndexConfigs[number][0];
type ApmIndicesSavedObjectAttributes = Partial<{
  [Property in ApmIndexConfigs]: string;
}>;
type DeprecatedApmIndexConfigPaths = typeof apmIndexConfigs[number][1];
type DeprecatedApmIndicesSavedObjectAttributes = Partial<{
  [Property in DeprecatedApmIndexConfigPaths]: string;
}>;

export function updateApmOssIndexPaths(
  attributes: DeprecatedApmIndicesSavedObjectAttributes
) {
  return apmIndexConfigs.reduce((attrs, [configPath, deprecatedConfigPath]) => {
    const indexConfig: string | undefined = attributes[deprecatedConfigPath];
    if (indexConfig) {
      attrs[configPath] = indexConfig;
    }
    return attrs;
  }, {} as ApmIndicesSavedObjectAttributes);
}
