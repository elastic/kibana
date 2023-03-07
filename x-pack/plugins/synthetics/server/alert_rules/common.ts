/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isRight } from 'fp-ts/lib/Either';
import Mustache from 'mustache';
import { IBasePath } from '@kbn/core/server';
import { RuleExecutorServices } from '@kbn/alerting-plugin/server';
import { addSpaceIdToPath } from '@kbn/spaces-plugin/common';
import { i18n } from '@kbn/i18n';
import {
  SyntheticsCommonState,
  SyntheticsCommonStateType,
} from '../../common/runtime_types/alert_rules/common';
import { ALERT_DETAILS_URL, RECOVERY_REASON } from './action_variables';
import { AlertOverviewStatus } from './status_rule/status_rule_executor';

export const updateState = (
  state: SyntheticsCommonState,
  isTriggeredNow: boolean,
  meta?: SyntheticsCommonState['meta']
): SyntheticsCommonState => {
  const now = new Date().toISOString();
  const decoded = SyntheticsCommonStateType.decode(state);
  if (!isRight(decoded)) {
    const triggerVal = isTriggeredNow ? now : undefined;
    return {
      firstCheckedAt: now,
      firstTriggeredAt: triggerVal,
      isTriggered: isTriggeredNow,
      lastTriggeredAt: triggerVal,
      lastCheckedAt: now,
      lastResolvedAt: undefined,
      meta: {},
    };
  }
  const {
    firstCheckedAt,
    firstTriggeredAt,
    lastTriggeredAt,
    // this is the stale trigger status, we're naming it `wasTriggered`
    // to differentiate it from the `isTriggeredNow` param
    isTriggered: wasTriggered,
    lastResolvedAt,
  } = decoded.right;

  return {
    meta,
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

export const setRecoveredAlertsContext = ({
  alertFactory,
  basePath,
  getAlertUuid,
  spaceId,
  staleDownConfigs,
  upConfigs,
}: {
  alertFactory: RuleExecutorServices['alertFactory'];
  basePath?: IBasePath;
  getAlertUuid?: (alertId: string) => string | null;
  spaceId?: string;
  staleDownConfigs: AlertOverviewStatus['staleDownConfigs'];
  upConfigs: AlertOverviewStatus['upConfigs'];
}) => {
  const { getRecoveredAlerts } = alertFactory.done();
  for (const alert of getRecoveredAlerts()) {
    const recoveredAlertId = alert.getId();
    const alertUuid = getAlertUuid?.(recoveredAlertId) || undefined;

    const state = alert.getState() as SyntheticsCommonState;

    let recoveryReason = '';
    let isUp = false;

    if (state?.idWithLocation && staleDownConfigs[state.idWithLocation]) {
      const { idWithLocation } = state;
      const downConfig = staleDownConfigs[idWithLocation];
      if (downConfig.isDeleted) {
        recoveryReason = i18n.translate('xpack.synthetics.alerts.monitorStatus.deleteMonitor', {
          defaultMessage: `Monitor has been deleted`,
        });
      } else if (downConfig.isLocationRemoved) {
        recoveryReason = i18n.translate('xpack.synthetics.alerts.monitorStatus.removedLocation', {
          defaultMessage: `Location has been removed from the monitor`,
        });
      }
    }

    if (state?.idWithLocation && upConfigs[state.idWithLocation]) {
      isUp = Boolean(upConfigs[state.idWithLocation]) || false;
      recoveryReason = i18n.translate('xpack.synthetics.alerts.monitorStatus.upCheck', {
        defaultMessage: `Monitor has recovered with status Up`,
      });
    }

    alert.setContext({
      ...state,
      ...(isUp ? { status: 'up' } : {}),
      ...(recoveryReason ? { [RECOVERY_REASON]: recoveryReason } : {}),
      ...(basePath && spaceId && alertUuid
        ? { [ALERT_DETAILS_URL]: getAlertDetailsUrl(basePath, spaceId, alertUuid) }
        : {}),
    });
  }
};
