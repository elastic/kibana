/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DeprecationsDetails, GetDeprecationsContext } from '@kbn/core/server';
import { i18n } from '@kbn/i18n';
import { ILM_POLICY_NAME, INTERNAL_ROUTES } from '@kbn/reporting-common';
import { REPORTING_DATA_STREAM_WILDCARD_WITH_LEGACY } from '@kbn/reporting-server';
import { IlmPolicyManager } from '../lib/store';

export const getDeprecationsInfo = async ({
  esClient,
}: GetDeprecationsContext): Promise<DeprecationsDetails[]> => {
  const ilmPolicyManager = IlmPolicyManager.create({ client: esClient.asInternalUser });
  const migrationStatus = await ilmPolicyManager.checkIlmMigrationStatus();

  if (migrationStatus !== 'ok') {
    return [
      {
        title: i18n.translate('xpack.reporting.deprecations.migrateIndexIlmPolicyActionTitle', {
          defaultMessage: 'Found reporting indices managed by custom ILM policy.',
        }),
        level: 'warning',
        message: i18n.translate('xpack.reporting.deprecations.migrateIndexIlmPolicyActionMessage', {
          defaultMessage: `New reporting indices will be managed by the "{reportingIlmPolicy}" provisioned ILM policy. You must edit this policy to manage the report lifecycle. This change targets the hidden system index pattern "{indexPattern}".`,
          values: {
            reportingIlmPolicy: ILM_POLICY_NAME,
            indexPattern: REPORTING_DATA_STREAM_WILDCARD_WITH_LEGACY,
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
            path: INTERNAL_ROUTES.MIGRATE.MIGRATE_ILM_POLICY,
          },
        },
      },
    ];
  }

  return [];
};
