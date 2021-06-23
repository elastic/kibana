/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Logger } from 'src/core/server';
import { schema } from '@kbn/config-schema';
import { parseScheduleDates } from '@kbn/securitysolution-io-ts-utils';
import {
  DEFAULT_RULE_NOTIFICATION_QUERY_SIZE,
  NOTIFICATIONS_ID,
  SERVER_APP_ID,
} from '../../../../common/constants';

import { NotificationAlertTypeDefinition } from './types';
import { AlertAttributes } from '../signals/types';
import { siemRuleActionGroups } from '../signals/siem_rule_action_groups';
import { scheduleNotificationActions } from './schedule_notification_actions';
import { getNotificationResultsLink } from './utils';
import { getSignals } from './get_signals';

export const rulesNotificationAlertType = ({
  logger,
}: {
  logger: Logger;
}): NotificationAlertTypeDefinition => ({
  id: NOTIFICATIONS_ID,
  name: 'SIEM notification',
  actionGroups: siemRuleActionGroups,
  defaultActionGroupId: 'default',
  producer: SERVER_APP_ID,
  validate: {
    params: schema.object({
      ruleAlertId: schema.string(),
    }),
  },
  minimumLicenseRequired: 'basic',
  async executor({ startedAt, previousStartedAt, alertId, services, params }) {
    const ruleAlertSavedObject = await services.savedObjectsClient.get<AlertAttributes>(
      'alert',
      params.ruleAlertId
    );

    if (!ruleAlertSavedObject.attributes.params) {
      logger.error(`Saved object for alert ${params.ruleAlertId} was not found`);
      return;
    }

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
      typeof results.hits.total === 'number' ? results.hits.total : results.hits.total.value;

    const resultsLink = getNotificationResultsLink({
      from: fromInMs,
      to: toInMs,
      id: ruleAlertSavedObject.id,
      kibanaSiemAppUrl: (ruleAlertParams.meta as { kibana_siem_app_url?: string } | undefined)
        ?.kibana_siem_app_url,
    });

    logger.info(
      `Found ${signalsCount} signals using signal rule name: "${ruleParams.name}", id: "${params.ruleAlertId}", rule_id: "${ruleParams.ruleId}" in "${ruleParams.outputIndex}" index`
    );

    if (signalsCount !== 0) {
      const alertInstance = services.alertInstanceFactory(alertId);
      scheduleNotificationActions({
        alertInstance,
        signalsCount,
        resultsLink,
        ruleParams,
        signals,
      });
    }
  },
});
