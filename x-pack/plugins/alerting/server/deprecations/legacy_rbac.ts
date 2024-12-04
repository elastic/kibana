/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DeprecationsDetails } from '@kbn/core-deprecations-common';
import { GetDeprecationsContext } from '@kbn/core-deprecations-server';
import { i18n } from '@kbn/i18n';
import { nodeBuilder } from '@kbn/es-query';
import { USAGE_COUNTERS_SAVED_OBJECT_TYPE } from '@kbn/usage-collection-plugin/server';

export const getLegacyRbacDeprecationsInfo = async ({
  savedObjectsClient,
}: GetDeprecationsContext): Promise<DeprecationsDetails[]> => {
  const filter = nodeBuilder.and([
    nodeBuilder.is('usage-counter.attributes.counterType', 'legacyRBACExemption'),
  ]);

  const { saved_objects: legacyRBACExemptions } = await savedObjectsClient.find({
    filter,
    type: USAGE_COUNTERS_SAVED_OBJECT_TYPE,
  });

  if (legacyRBACExemptions.length) {
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
