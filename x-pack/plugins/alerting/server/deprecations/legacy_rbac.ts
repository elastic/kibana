/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DeprecationsDetails } from '@kbn/core-deprecations-common';
import { GetDeprecationsContext } from '@kbn/core-deprecations-server';
import { i18n } from '@kbn/i18n';

export const getLegacyRbacDeprecationsInfo = async ({
  esClient,
}: GetDeprecationsContext): Promise<DeprecationsDetails[]> => {
  const { hits: legacyRBACExemptions } = await esClient.asCurrentUser.search({
    index: '.kibana*',
    body: {
      runtime_mappings: {
        apiKeyVersion: {
          type: 'keyword',
          script: {
            source:
              "def alert = params._source['alert']; if (alert != null) { def meta = alert.meta; if (meta != null) { emit(meta.versionApiKeyLastmodified); } else { emit('');}}",
          },
        },
      },
      size: 10000,
      query: {
        bool: {
          filter: [
            {
              term: {
                type: 'alert',
              },
            },
            {
              term: {
                apiKeyVersion: 'pre-7.10.0',
              },
            },
          ],
        },
      },
    },
  });

  if (legacyRBACExemptions.hits.length) {
    return [
      {
        title: i18n.translate('xpack.alerting.deprecations.legacyRbacExemption.title', {
          defaultMessage: 'Legacy RBAC exemption',
        }),
        level: 'warning',
        deprecationType: 'feature',
        message: i18n.translate('xpack.alerting.deprecations.legacyRbacExemption.message', {
          defaultMessage:
            'The legacy RBAC exemption for Alerting rules has been removed in future versions, and this cluster has alerting rules triggering actions that rely on the legacy exemption. The affected alerting rules will fail to trigger connector actions whenever alerts are found',
        }),
        correctiveActions: {
          manualSteps: [
            i18n.translate('xpack.alerting.deprecations.legacyRbacExemption.manualStepOne', {
              defaultMessage:
                'Look up the affected alerting rules by filtering for those that encountered action failures (via Stack Management > Rules)',
            }),
            i18n.translate('xpack.alerting.deprecations.legacyRbacExemption.manualStepTwo', {
              defaultMessage:
                'Update the alerting rule API key by editing the rule, so the authorization uses the normal RBAC process',
            }),
          ],
        },
      },
    ];
  }
  return [];
};
