/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { DeprecationsDetails, GetDeprecationsContext } from '@kbn/core/server';
import { API_MIGRATE_ILM_POLICY_URL, ILM_POLICY_NAME } from '../../common/constants';
import { ReportingCore } from '../core';
import { deprecations } from '../lib/deprecations';

interface ExtraDependencies {
  reportingCore: ReportingCore;
}

export const getDeprecationsInfo = async (
  { esClient }: GetDeprecationsContext,
  { reportingCore }: ExtraDependencies
): Promise<DeprecationsDetails[]> => {
  const store = await reportingCore.getStore();
  const indexPattern = store.getReportingIndexPattern();

  const migrationStatus = await deprecations.checkIlmMigrationStatus({
    reportingCore,
    elasticsearchClient: esClient.asInternalUser,
  });

  if (migrationStatus !== 'ok') {
    return [
      {
        title: i18n.translate('xpack.reporting.deprecations.migrateIndexIlmPolicyActionTitle', {
          defaultMessage: 'Found reporting indices managed by custom ILM policy.',
        }),
        level: 'warning',
        message: i18n.translate('xpack.reporting.deprecations.migrateIndexIlmPolicyActionMessage', {
          defaultMessage: `New reporting indices will be managed by the "{reportingIlmPolicy}" provisioned ILM policy. You must edit this policy to manage the report lifecycle. This change targets all indices prefixed with "{indexPattern}".`,
          values: {
            reportingIlmPolicy: ILM_POLICY_NAME,
            indexPattern,
          },
        }),
        correctiveActions: {
          manualSteps: [
            i18n.translate(
              'xpack.reporting.deprecations.migrateIndexIlmPolicy.manualStepOneMessage',
              {
                defaultMessage:
                  'Update all reporting indices to use the "{reportingIlmPolicy}" policy using the index settings API.',
                values: { reportingIlmPolicy: ILM_POLICY_NAME },
              }
            ),
          ],
          api: {
            method: 'PUT',
            path: API_MIGRATE_ILM_POLICY_URL,
          },
        },
      },
    ];
  }

  return [];
};
