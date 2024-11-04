/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DeprecationsDetails, GetDeprecationsContext } from '@kbn/core/server';
import { i18n } from '@kbn/i18n';

import type { ConfigType } from '../config';

import { getNonMigratedSignalsInfo } from '../lib/detection_engine/migrations/signals/get_non_migrated_signals_info';

export const getSignalsMigrationDeprecationsInfo = async (
  ctx: GetDeprecationsContext,
  config: ConfigType
): Promise<DeprecationsDetails[]> => {
  const esClient = ctx.esClient.asInternalUser;

  const { isMigrationRequired, spaces, fromRange } = await getNonMigratedSignalsInfo({
    esClient,
    signalsIndex: config.signalsIndex,
  });

  if (isMigrationRequired) {
    return [
      {
        deprecationType: 'feature',
        title: i18n.translate('xpack.securitySolution.deprecations.signalsMigrationTitle', {
          defaultMessage: 'Found not migrated detection alerts',
        }),
        level: 'critical',
        message: i18n.translate('xpack.securitySolution.deprecations.signalsMigrationMessage', {
          defaultMessage: `After upgrading Kibana, the latest Elastic Security features will be available for any newly generated detection alerts. However, in order to enable new features for existing detection alerts, migration may be necessary.`,
        }),
        documentationUrl:
          'https://www.elastic.co/guide/en/security/current/signals-migration-api.html',
        correctiveActions: {
          manualSteps: [
            i18n.translate(
              'xpack.securitySolution.deprecations.migrateIndexIlmPolicy.signalsMigrationManualStepOne',
              {
                defaultMessage: `Visit "Learn more" link for instructions how to migrate detection alerts. Migrate indices for each space.`,
              }
            ),
            i18n.translate(
              'xpack.securitySolution.deprecations.migrateIndexIlmPolicy.signalsMigrationManualStepTwo',
              {
                defaultMessage: 'Spaces with at least one non-migrated signals index: {spaces}.',
                values: {
                  spaces: spaces.join(', '),
                },
              }
            ),
            i18n.translate(
              'xpack.securitySolution.deprecations.migrateIndexIlmPolicy.signalsMigrationManualStepThree',
              {
                defaultMessage:
                  'Oldest non-migrated signal found with "{fromRange}" timestamp. Use this value as query parameter "from" in migration API.',
                values: {
                  fromRange,
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
