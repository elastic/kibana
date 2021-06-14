/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type {
  IndicesIndexStatePrefixedSettings,
  IndicesIndexSettings,
} from '@elastic/elasticsearch/api/types';
import type { DeprecationsDependencies } from './types';

export const shouldMigrateIndices = async ({
  reportingCore,
  elasticsearchClient,
}: DeprecationsDependencies) => {
  const store = await reportingCore.getStore();
  const reportingIlmPolicy = store.getIlmPolicyName();
  const indexPattern = store.getReportingIndexPattern();

  const { body: reportingIndicesSettings } = await elasticsearchClient.indices.getSettings({
    index: indexPattern,
  });

  const hasUnmanagedIndices = Object.values(reportingIndicesSettings).some(
    (settings) =>
      (settings?.settings as IndicesIndexStatePrefixedSettings)?.index?.lifecycle?.name !==
        reportingIlmPolicy ||
      (settings?.settings as IndicesIndexSettings)?.['index.lifecycle']?.name !== reportingIlmPolicy
  );

  return hasUnmanagedIndices;
};
