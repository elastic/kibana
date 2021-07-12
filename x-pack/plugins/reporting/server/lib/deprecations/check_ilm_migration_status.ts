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
import { ILM_POLICY_NAME } from '../../../common/constants';
import { IlmPolicyMigrationStatus } from '../../../common/types';
import { IlmPolicyManager } from '../../lib/store/ilm_policy_manager';
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

  const { body: reportingIndicesSettings } = await elasticsearchClient.indices.getSettings({
    index: indexPattern,
  });

  const hasUnmanagedIndices = Object.values(reportingIndicesSettings).some((settings) => {
    return (
      (settings?.settings as IndicesIndexStatePrefixedSettings)?.index?.lifecycle?.name !==
        ILM_POLICY_NAME &&
      (settings?.settings as IndicesIndexSettings)?.['index.lifecycle']?.name !== ILM_POLICY_NAME
    );
  });

  return hasUnmanagedIndices ? 'indices-not-managed-by-policy' : 'ok';
};
