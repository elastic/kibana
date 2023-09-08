/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isRight } from 'fp-ts/lib/Either';
import Mustache from 'mustache';
import { AlertsLocatorParams, getAlertUrl } from '@kbn/observability-plugin/common';
import { LocatorPublic } from '@kbn/share-plugin/common';
import { legacyExperimentalFieldMap } from '@kbn/alerts-as-data-utils';
import { IBasePath } from '@kbn/core/server';
import { type IRuleTypeAlerts, RuleExecutorServices } from '@kbn/alerting-plugin/server';
import { addSpaceIdToPath } from '@kbn/spaces-plugin/common';
import { uptimeRuleFieldMap } from '../../../../common/rules/uptime_rule_field_map';
import { SYNTHETICS_RULE_TYPES_ALERT_CONTEXT } from '../../../../common/constants/synthetics_alerts';
import { UptimeCommonState, UptimeCommonStateType } from '../../../../common/runtime_types';
import { ALERT_DETAILS_URL } from './action_variables';

export type UpdateUptimeAlertState = (
  state: Record<string, any>,
  isTriggeredNow: boolean
) => UptimeCommonState;

export const updateState: UpdateUptimeAlertState = (state, isTriggeredNow) => {
  const now = new Date().toISOString();
  const decoded = UptimeCommonStateType.decode(state);
  if (!isRight(decoded)) {
    const triggerVal = isTriggeredNow ? now : undefined;
    return {
      currentTriggerStarted: triggerVal,
      firstCheckedAt: now,
      firstTriggeredAt: triggerVal,
      isTriggered: isTriggeredNow,
      lastTriggeredAt: triggerVal,
      lastCheckedAt: now,
      lastResolvedAt: undefined,
    };
  }
  const {
    currentTriggerStarted,
    firstCheckedAt,
    firstTriggeredAt,
    lastTriggeredAt,
    // this is the stale trigger status, we're naming it `wasTriggered`
    // to differentiate it from the `isTriggeredNow` param
    isTriggered: wasTriggered,
    lastResolvedAt,
  } = decoded.right;

  let cts: string | undefined;
  if (isTriggeredNow && !currentTriggerStarted) {
    cts = now;
  } else if (isTriggeredNow) {
    cts = currentTriggerStarted;
  }
  return {
    currentTriggerStarted: cts,
    firstCheckedAt: firstCheckedAt ?? now,
    firstTriggeredAt: isTriggeredNow && !firstTriggeredAt ? now : firstTriggeredAt,
    lastCheckedAt: now,
    lastTriggeredAt: isTriggeredNow ? now : lastTriggeredAt,
    lastResolvedAt: !isTriggeredNow && wasTriggered ? now : lastResolvedAt,
    isTriggered: isTriggeredNow,
  };
};

export const generateAlertMessage = (messageTemplate: string, fields: Record<string, any>) => {
  return Mustache.render(messageTemplate, { context: { ...fields }, state: { ...fields } });
};

export const getViewInAppUrl = (
  basePath: IBasePath,
  spaceId: string,
  relativeViewInAppUrl: string
) => addSpaceIdToPath(basePath.publicBaseUrl, spaceId, relativeViewInAppUrl);

export const getAlertDetailsUrl = (
  basePath: IBasePath,
  spaceId: string,
  alertUuid: string | null
) => addSpaceIdToPath(basePath.publicBaseUrl, spaceId, `/app/observability/alerts/${alertUuid}`);

export const setRecoveredAlertsContext = async ({
  alertFactory,
  basePath,
  defaultStartedAt,
  getAlertStartedDate,
  spaceId,
  alertsLocator,
  getAlertUuid,
}: {
  alertFactory: RuleExecutorServices['alertFactory'];
  defaultStartedAt: string;
  getAlertStartedDate: (alertInstanceId: string) => string | null;
  basePath: IBasePath;
  spaceId: string;
  alertsLocator?: LocatorPublic<AlertsLocatorParams>;
  getAlertUuid?: (alertId: string) => string | null;
}) => {
  const { getRecoveredAlerts } = alertFactory.done();

  for await (const alert of getRecoveredAlerts()) {
    const recoveredAlertId = alert.getId();
    const alertUuid = getAlertUuid?.(recoveredAlertId) || null;
    const indexedStartedAt = getAlertStartedDate(recoveredAlertId) ?? defaultStartedAt;

    const state = alert.getState();
    const alertUrl = await getAlertUrl(
      alertUuid,
      spaceId,
      indexedStartedAt,
      alertsLocator,
      basePath.publicBaseUrl
    );

    alert.setContext({
      ...state,
      [ALERT_DETAILS_URL]: alertUrl,
    });
  }
};

export const uptimeRuleTypeFieldMap = { ...uptimeRuleFieldMap, ...legacyExperimentalFieldMap };

export const UptimeRuleTypeAlertDefinition: IRuleTypeAlerts = {
  context: SYNTHETICS_RULE_TYPES_ALERT_CONTEXT,
  mappings: { fieldMap: uptimeRuleTypeFieldMap },
  useLegacyAlerts: true,
};
