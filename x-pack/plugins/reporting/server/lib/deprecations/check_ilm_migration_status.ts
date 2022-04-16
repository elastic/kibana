/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ILM_POLICY_NAME } from '../../../common/constants';
import { IlmPolicyMigrationStatus } from '../../../common/types';
import { IlmPolicyManager } from '../store/ilm_policy_manager';
import type { DeprecationsDependencies } from './types';

export const checkIlmMigrationStatus = async ({
  reportingCore,
  elasticsearchClient,
}: DeprecationsDependencies): Promise<IlmPolicyMigrationStatus> => {
  const ilmPolicyManager = IlmPolicyManager.create({ client: elasticsearchClient });
  if (!(await ilmPolicyManager.doesIlmPolicyExist())) {
    return 'policy-not-found';
  }

  const store = await reportingCore.getStore();
  const indexPattern = store.getReportingIndexPattern();

  const reportingIndicesSettings = await elasticsearchClient.indices.getSettings({
    index: indexPattern,
  });

  const hasUnmanagedIndices = Object.values(reportingIndicesSettings).some((settings) => {
    return (
      settings?.settings?.index?.lifecycle?.name !== ILM_POLICY_NAME &&
      // @ts-expect-error index.lifecycle not present on type def
      settings?.settings?.['index.lifecycle']?.name !== ILM_POLICY_NAME
    );
  });

  return hasUnmanagedIndices ? 'indices-not-managed-by-policy' : 'ok';
};
