/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mapKeys, snakeCase } from 'lodash/fp';
import type { Logger } from '@kbn/core/server';
import { parseScheduleDates } from '@kbn/securitysolution-io-ts-utils';
import { DEFAULT_APP_CATEGORIES } from '@kbn/core-application-common';
import { AlertsClientError, DEFAULT_AAD_CONFIG } from '@kbn/alerting-plugin/server';
import { RULE_MANAGEMENT_FEATURE_ID } from '@kbn/security-solution-features/src/constants';
import {
  DEFAULT_RULE_NOTIFICATION_QUERY_SIZE,
  LEGACY_NOTIFICATIONS_ID,
  SERVER_APP_ID,
} from '../../../../../../common/constants';

// eslint-disable-next-line no-restricted-imports
import type { LegacyNotificationRuleTypeDefinition } from './legacy_types';
// eslint-disable-next-line no-restricted-imports
import { legacyRulesNotificationParams } from './legacy_types';
import type { AlertAttributes } from '../../../rule_types/types';
import { siemRuleActionGroups } from '../../../rule_types/utils/siem_rule_action_groups';
import { formatAlertsForNotificationActions } from './schedule_notification_actions';
import { getNotificationResultsLink } from './utils';
import { getSignals } from './get_signals';
// eslint-disable-next-line no-restricted-imports
import { legacyExtractReferences } from './legacy_saved_object_references/legacy_extract_references';
// eslint-disable-next-line no-restricted-imports
import { legacyInjectReferences } from './legacy_saved_object_references/legacy_inject_references';

/**
 * @deprecated Once we are confident all rules relying on side-car actions SO's have been migrated to SO references we should remove this function
 */
export const legacyRulesNotificationRuleType = ({
  logger,
}: {
  logger: Logger;
}): LegacyNotificationRuleTypeDefinition => ({
  id: LEGACY_NOTIFICATIONS_ID,
  name: 'Security Solution notification (Legacy)',
  actionGroups: siemRuleActionGroups,
  defaultActionGroupId: 'default',
  category: DEFAULT_APP_CATEGORIES.security.id,
  producer: RULE_MANAGEMENT_FEATURE_ID,
  validate: {
    params: legacyRulesNotificationParams,
  },
  schemas: {
    params: {
      type: 'config-schema',
      schema: legacyRulesNotificationParams,
    },
  },
  useSavedObjectReferences: {
    extractReferences: (params) => legacyExtractReferences({ logger, params }),
    injectReferences: (params, savedObjectReferences) =>
      legacyInjectReferences({ logger, params, savedObjectReferences }),
  },
  minimumLicenseRequired: 'basic',
  isExportable: false,
  alerts: DEFAULT_AAD_CONFIG,
  async executor({
    startedAt,
    previousStartedAt,
    rule: { id: ruleId },
    services,
    params,
    spaceId,
  }) {
    const { alertsClient } = services;
    if (!alertsClient) {
      throw new AlertsClientError();
    }

    const ruleAlertSavedObject = await services.savedObjectsClient.get<AlertAttributes>(
      'alert',
      params.ruleAlertId
    );

    if (!ruleAlertSavedObject.attributes.params) {
      logger.error(
        [
          `Security Solution notification (Legacy) saved object for alert ${params.ruleAlertId} was not found with`,
          `id: "${ruleId}".`,
          `space id: "${spaceId}"`,
          'This indicates a dangling (Legacy) notification alert.',
          'You should delete this rule through "Kibana UI -> Stack Management -> Rules and Connectors" to remove this error message.',
        ].join(' ')
      );
      return;
    }

    logger.warn(
      [
        'Security Solution notification (Legacy) system still active for alert with',
        `name: "${ruleAlertSavedObject.attributes.name}"`,
        `description: "${ruleAlertSavedObject.attributes.params.description}"`,
        `id: "${ruleAlertSavedObject.id}".`,
        `space id: "${spaceId}"`,
        'Editing or updating this rule through "Kibana UI -> Security -> Alerts -> Manage Rules"',
        'will auto-migrate the rule to the new notification system and remove this warning message.',
      ].join(' ')
    );

    const { params: ruleAlertParams, name: ruleName } = ruleAlertSavedObject.attributes;
    const ruleParams = { ...ruleAlertParams, name: ruleName, id: ruleAlertSavedObject.id };

    const fromInMs = parseScheduleDates(
      previousStartedAt
        ? previousStartedAt.toISOString()
        : `now-${ruleAlertSavedObject.attributes.schedule.interval}`
    )?.format('x');
    const toInMs = parseScheduleDates(startedAt.toISOString())?.format('x');

    const results = await getSignals({
      from: fromInMs,
      to: toInMs,
      size: DEFAULT_RULE_NOTIFICATION_QUERY_SIZE,
      index: ruleParams.outputIndex,
      ruleId: ruleParams.ruleId,
      esClient: services.scopedClusterClient.asCurrentUser,
    });

    const signals = results.hits.hits.map((hit) => hit._source);

    const signalsCount =
      typeof results.hits.total === 'number' ? results.hits.total : results.hits.total?.value ?? 0;

    const resultsLink = getNotificationResultsLink({
      from: fromInMs,
      to: toInMs,
      id: ruleAlertSavedObject.id,
      kibanaSiemAppUrl: (ruleAlertParams.meta as { kibana_siem_app_url?: string } | undefined)
        ?.kibana_siem_app_url,
    });

    logger.debug(
      `Security Solution notification (Legacy) found ${signalsCount} signals using signal rule name: "${ruleParams.name}", id: "${params.ruleAlertId}", rule_id: "${ruleParams.ruleId}" in "${ruleParams.outputIndex}" index`
    );

    if (signalsCount !== 0) {
      alertsClient.report({
        id: ruleId,
        actionGroup: 'default',
        state: {
          signals_count: signalsCount,
        },
        context: {
          results_link: resultsLink,
          rule: mapKeys(snakeCase, ruleParams),
          alerts: formatAlertsForNotificationActions(signals),
        },
      });
    }
  },
});
