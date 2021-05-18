/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { DeprecationsDetails, GetDeprecationsContext } from 'src/core/server';
import { ReportingCore } from '../core';

interface ExtraDependencies {
  reportingCore: ReportingCore;
}

export const migrateExistingIndicesIlmPolicy = async (
  { esClient }: GetDeprecationsContext,
  { reportingCore }: ExtraDependencies
): Promise<DeprecationsDetails[]> => {
  const store = await reportingCore.getStore();
  const reportingIlmPolicy = store.getIlmPolicyName();
  const reportingIndexPrefix = store.getIndexPrefix();

  const { body: reportingIndicesSettings } = await esClient.asInternalUser.indices.getSettings({
    index: `${store.getIndexPrefix()}-*`,
  });

  const someIndicesNotManagedByReportingIlm = Object.values(reportingIndicesSettings).some(
    (settings) => settings?.settings?.index?.lifecycle?.name !== reportingIlmPolicy
  );

  if (someIndicesNotManagedByReportingIlm) {
    return [
      {
        level: 'warning',
        message: i18n.translate('xpack.reporting.deprecations.migrateIndexIlmPolicyActionMessage', {
          defaultMessage: `Reporting indices can be managed by a provisioned ILM policy, ${reportingIlmPolicy}. This policy should be used to manage the lifecycle of indices. Please note, this action will target all indices prefixed with "${reportingIndexPrefix}-*".`,
        }),
        correctiveActions: {
          api: {
            method: 'PUT',
            path: `${reportingIndexPrefix}-*/_settings`,
            body: {
              index: {
                lifecycle: {
                  name: reportingIlmPolicy,
                },
              },
            },
          },
        },
      },
    ];
  }

  return [];
};
