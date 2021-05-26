/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { DeprecationsDetails, GetDeprecationsContext } from 'src/core/server';
import { API_MIGRATE_ILM_POLICY_URL } from '../../common/constants';
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
  const indexPattern = store.getReportingIndexPattern();

  const { body: reportingIndicesSettings } = await esClient.asInternalUser.indices.getSettings({
    index: indexPattern,
  });

  const someIndicesNotManagedByReportingIlm = Object.values(reportingIndicesSettings).some(
    (settings) => settings?.settings?.index?.lifecycle?.name !== reportingIlmPolicy
  );

  if (someIndicesNotManagedByReportingIlm) {
    return [
      {
        level: 'warning',
        message: i18n.translate('xpack.reporting.deprecations.migrateIndexIlmPolicyActionMessage', {
          defaultMessage: `All new reporting indices will be managed by a provisioned ILM policy: "${reportingIlmPolicy}". To manage the lifecycle of reports edit the ${reportingIlmPolicy} policy. Please note, this action will target all indices prefixed with "${indexPattern}".`,
        }),
        correctiveActions: {
          api: {
            method: 'PUT',
            path: API_MIGRATE_ILM_POLICY_URL,
          },
          manualSteps: [
            i18n.translate(
              'xpack.reporting.deprecations.migrateIndexIlmPolicy.stepOneDescription',
              {
                defaultMessage:
                  'Send a request to Elasticsearch that configures indices matching "{indexPattern}" to be managed by the "{reportingIlmPolicy}" Index Lifecycle Policy.',
                values: {
                  indexPattern,
                  reportingIlmPolicy,
                },
              }
            ),
          ],
        },
      },
    ];
  }

  return [];
};
