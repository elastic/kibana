/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import moment, { Moment } from 'moment';
import { isRight } from 'fp-ts/lib/Either';
import Mustache from 'mustache';
import { IBasePath } from '@kbn/core/server';
import { RuleExecutorServices } from '@kbn/alerting-plugin/server';
import { addSpaceIdToPath } from '@kbn/spaces-plugin/common';
import { i18n } from '@kbn/i18n';
import {
  SyntheticsCommonState,
  SyntheticsCommonStateCodec,
  SyntheticsMonitorStatusAlertState,
} from '../../common/runtime_types/alert_rules/common';
import { getSyntheticsMonitorRouteFromMonitorId } from '../../common/utils/get_synthetics_monitor_url';
import { ALERT_DETAILS_URL, RECOVERY_REASON } from './action_variables';
import { AlertOverviewStatus } from './status_rule/status_rule_executor';

export const updateState = (
  state: SyntheticsCommonState,
  isTriggeredNow: boolean,
  meta?: SyntheticsCommonState['meta']
): SyntheticsCommonState => {
  const now = new Date().toISOString();
  const decoded = SyntheticsCommonStateCodec.decode(state);
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

export const getFullViewInAppMessage = (
  basePath: IBasePath,
  spaceId: string,
  relativeViewInAppUrl: string
) => {
  const relativeLinkLabel = i18n.translate(
    'xpack.synthetics.alerts.monitorStatus.relativeLink.label',
    {
      defaultMessage: `Relative link`,
    }
  );
  const absoluteLinkLabel = i18n.translate(
    'xpack.synthetics.alerts.monitorStatus.absoluteLink.label',
    {
      defaultMessage: `Link`,
    }
  );
  if (basePath.publicBaseUrl) {
    return `${absoluteLinkLabel}: ${getViewInAppUrl(basePath, spaceId, relativeViewInAppUrl)}`;
  } else {
    return `${relativeLinkLabel}: ${getViewInAppUrl(basePath, spaceId, relativeViewInAppUrl)}`;
  }
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

export const getRelativeViewInAppUrl = ({
  configId,
  locationId,
  errorStartedAt,
  dateRangeEnd = 'now',
}: {
  configId: string;
  locationId: string;
  errorStartedAt: string;
  dateRangeEnd?: string;
}) => {
  const dateRangeStart = moment(errorStartedAt).subtract('5', 'minutes').toISOString();

  const relativeViewInAppUrl = getSyntheticsMonitorRouteFromMonitorId({
    configId,
    dateRangeEnd,
    dateRangeStart,
    locationId,
  });

  return relativeViewInAppUrl;
};

const getErrorDuration = (startedAt: Moment, endsAt: Moment) => {
  // const endsAt = state.ends ? moment(state.ends) : moment();
  // const startedAt = moment(state?.started_at);

  const diffInDays = endsAt.diff(startedAt, 'days');
  if (diffInDays > 1) {
    return i18n.translate('xpack.synthetics.errorDetails.errorDuration.days', {
      defaultMessage: '{value} days',
      values: { value: diffInDays },
    });
  }
  const diffInHours = endsAt.diff(startedAt, 'hours');
  if (diffInHours > 1) {
    return i18n.translate('xpack.synthetics.errorDetails.errorDuration.hours', {
      defaultMessage: '{value} hours',
      values: { value: diffInHours },
    });
  }
  const diffInMinutes = endsAt.diff(startedAt, 'minutes');
  return i18n.translate('xpack.synthetics.errorDetails.errorDuration.mins', {
    defaultMessage: '{value} mins',
    values: { value: diffInMinutes },
  });
};

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

    const state = alert.getState() as SyntheticsCommonState & SyntheticsMonitorStatusAlertState;

    let recoveryReason = '';
    let recoveryStatus = i18n.translate(
      'xpack.synthetics.alerts.monitorStatus.defaultRecovery.status',
      {
        defaultMessage: `has recovered`,
      }
    );
    let isUp = false;
    let linkMessage = '';

    if (state?.idWithLocation && staleDownConfigs[state.idWithLocation]) {
      const { idWithLocation } = state;
      const downConfig = staleDownConfigs[idWithLocation];
      if (downConfig.isDeleted) {
        recoveryStatus = i18n.translate(
          'xpack.synthetics.alerts.monitorStatus.deleteMonitor.status',
          {
            defaultMessage: `has been deleted`,
          }
        );
        recoveryReason = i18n.translate(
          'xpack.synthetics.alerts.monitorStatus.deleteMonitor.reason',
          {
            defaultMessage: `The monitor has been deleted`,
          }
        );
      } else if (downConfig.isLocationRemoved) {
        recoveryStatus = i18n.translate(
          'xpack.synthetics.alerts.monitorStatus.removedLocation.status',
          {
            defaultMessage: `has recovered`,
          }
        );
        recoveryReason = i18n.translate(
          'xpack.synthetics.alerts.monitorStatus.removedLocation.reason',
          {
            defaultMessage: `This location has been removed from the monitor`,
          }
        );
      }
    }

    if (state?.idWithLocation && upConfigs[state.idWithLocation]) {
      const { idWithLocation, configId, locationId, errorStartedAt } = state;
      const upConfig = upConfigs[idWithLocation];
      isUp = Boolean(upConfig) || false;
      const upTimestamp = upConfig.ping['@timestamp'];
      const checkedAt = moment(upTimestamp).format('HH:MM:SS on DD/MM/YYYY');
      const duration = getErrorDuration(moment(errorStartedAt), moment(upTimestamp));
      recoveryStatus = i18n.translate('xpack.synthetics.alerts.monitorStatus.upCheck.status', {
        defaultMessage: `is now Up`,
      });
      recoveryReason = errorStartedAt
        ? i18n.translate('xpack.synthetics.alerts.monitorStatus.upCheck.reasonWithDuration', {
            defaultMessage: `The monitor returned to an Up state at {checkedAt} lasting {duration}`,
            values: {
              checkedAt,
              duration,
            },
          })
        : i18n.translate('xpack.synthetics.alerts.monitorStatus.upCheck.reasonWithoutDuration', {
            defaultMessage: `The monitor returned to an Up state at {checkedAt}`,
            values: {
              checkedAt,
            },
          });

      const dateRangeEnd = moment(upTimestamp).add('5', 'minutes').toISOString();

      const relativeViewInAppUrl = getRelativeViewInAppUrl({
        configId,
        locationId,
        errorStartedAt,
        dateRangeEnd,
      });

      if (basePath && spaceId && relativeViewInAppUrl) {
        linkMessage = getFullViewInAppMessage(basePath, spaceId, relativeViewInAppUrl);
      }
    }

    alert.setContext({
      ...state,
      recoveryStatus,
      linkMessage,
      ...(isUp ? { status: 'up' } : {}),
      ...(recoveryReason ? { [RECOVERY_REASON]: recoveryReason } : {}),
      ...(basePath && spaceId && alertUuid
        ? { [ALERT_DETAILS_URL]: getAlertDetailsUrl(basePath, spaceId, alertUuid) }
        : {}),
    });
  }
};
