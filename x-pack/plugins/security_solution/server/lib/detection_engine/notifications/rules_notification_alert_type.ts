/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Logger } from 'src/core/server';
import { schema } from '@kbn/config-schema';
import { NOTIFICATIONS_ID, SERVER_APP_ID } from '../../../../common/constants';

import { NotificationAlertTypeDefinition } from './types';
import { getSignalsCount } from './get_signals_count';
import { RuleAlertAttributes } from '../signals/types';
import { siemRuleActionGroups } from '../signals/siem_rule_action_groups';
import { scheduleNotificationActions } from './schedule_notification_actions';
import { getNotificationResultsLink } from './utils';
import { parseScheduleDates } from '../../../../common/detection_engine/utils';

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
  async executor({ startedAt, previousStartedAt, alertId, services, params }) {
    const ruleAlertSavedObject = await services.savedObjectsClient.get<RuleAlertAttributes>(
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

    const signalsCount = await getSignalsCount({
      from: fromInMs,
      to: toInMs,
      index: ruleParams.outputIndex,
      ruleId: ruleParams.ruleId,
      callCluster: services.callCluster,
    });

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
      scheduleNotificationActions({ alertInstance, signalsCount, resultsLink, ruleParams });
    }
  },
});
