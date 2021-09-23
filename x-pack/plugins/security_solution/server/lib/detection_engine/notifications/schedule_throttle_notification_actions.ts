/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient, SavedObject } from 'src/core/server';
import { parseScheduleDates } from '@kbn/securitysolution-io-ts-utils';
import { AlertInstance } from '../../../../../alerting/server';
import { RuleParams } from '../schemas/rule_schemas';
import { getNotificationResultsLink } from '../notifications/utils';
import { DEFAULT_RULE_NOTIFICATION_QUERY_SIZE } from '../../../../common/constants';
import { getSignals } from '../notifications/get_signals';
import {
  NotificationRuleTypeParams,
  scheduleNotificationActions,
} from './schedule_notification_actions';
import { AlertAttributes } from '../signals/types';

/**
 * Schedules a throttled notification action for executor rules.
 * @param throttle The throttle which is the alerting saved object throttle
 * @param startedAt When the executor started at
 * @param id The id the alert which caused the notifications
 * @param kibanaSiemAppUrl The security_solution application url
 * @param outputIndex The alerting index we wrote the signals into
 * @param ruleId The rule_id of the alert which caused the notifications
 * @param esClient The elastic client to do queries
 * @param alertInstance The alert instance for notifications
 * @param notificationRuleParams The notification rule parameters
 */
export const scheduleThrottledNotificationActions = async ({
  throttle,
  startedAt,
  id,
  kibanaSiemAppUrl,
  outputIndex,
  ruleId,
  esClient,
  alertInstance,
  notificationRuleParams,
}: {
  id: SavedObject['id'];
  startedAt: Date;
  throttle: AlertAttributes['throttle'];
  kibanaSiemAppUrl: string | undefined;
  outputIndex: RuleParams['outputIndex'];
  ruleId: RuleParams['ruleId'];
  esClient: ElasticsearchClient;
  alertInstance: AlertInstance;
  notificationRuleParams: NotificationRuleTypeParams;
}): Promise<void> => {
  const fromInMs = parseScheduleDates(`now-${throttle}`);
  const toInMs = parseScheduleDates(startedAt.toISOString());

  if (fromInMs != null && toInMs != null) {
    const resultsLink = getNotificationResultsLink({
      from: fromInMs.toISOString(),
      to: toInMs.toISOString(),
      id,
      kibanaSiemAppUrl,
    });

    const results = await getSignals({
      from: `${fromInMs.valueOf()}`,
      to: `${toInMs.valueOf()}`,
      size: DEFAULT_RULE_NOTIFICATION_QUERY_SIZE,
      index: outputIndex,
      ruleId,
      esClient,
    });

    const signalsCount =
      typeof results.hits.total === 'number' ? results.hits.total : results.hits.total.value;

    const signals = results.hits.hits.map((hit) => hit._source);
    if (results.hits.hits.length !== 0) {
      scheduleNotificationActions({
        alertInstance,
        signalsCount,
        signals,
        resultsLink,
        ruleParams: notificationRuleParams,
      });
    }
  }
};
