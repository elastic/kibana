/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import { i18n } from '@kbn/i18n';
import { ALERT_REASON } from '@kbn/rule-data-utils';
import { getConditionType, StatusRuleParams } from '../../../common/rules/status_rule';
import { AlertStatusMetaData } from './queries/query_monitor_status_alert';
import { getTimeUnitLabel } from '../common';
import { ALERT_REASON_MSG } from '../action_variables';
import { MonitorSummaryStatusRule } from './types';
import {
  MONITOR_ID,
  MONITOR_TYPE,
  MONITOR_NAME,
  OBSERVER_GEO_NAME,
  URL_FULL,
  ERROR_MESSAGE,
  AGENT_NAME,
  STATE_ID,
} from '../../../common/field_names';
import { OverviewPing } from '../../../common/runtime_types';
import { UNNAMED_LOCATION } from '../../../common/constants';

export const getMonitorAlertDocument = (
  monitorSummary: MonitorSummaryStatusRule,
  locationNames: string[],
  locationIds: string[],
  useLatestChecks: boolean
) => ({
  [MONITOR_ID]: monitorSummary.monitorId,
  [MONITOR_TYPE]: monitorSummary.monitorType,
  [MONITOR_NAME]: monitorSummary.monitorName,
  [URL_FULL]: monitorSummary.monitorUrl,
  [OBSERVER_GEO_NAME]: locationNames,
  [ERROR_MESSAGE]: monitorSummary.lastErrorMessage,
  [AGENT_NAME]: monitorSummary.hostName,
  [ALERT_REASON]: monitorSummary.reason,
  [STATE_ID]: monitorSummary.stateId,
  'location.id': locationIds,
  'location.name': locationNames,
  configId: monitorSummary.configId,
  'kibana.alert.evaluation.threshold': monitorSummary.downThreshold,
  'kibana.alert.evaluation.value':
    (useLatestChecks ? monitorSummary.checks?.downWithinXChecks : monitorSummary.checks?.down) ?? 1,
  'monitor.tags': monitorSummary.monitorTags ?? [],
});

export interface MonitorSummaryData {
  monitorInfo: OverviewPing;
  statusMessage: string;
  locationId: string[];
  configId: string;
  dateFormat: string;
  tz: string;
  checks?: {
    downWithinXChecks: number;
    down: number;
  };
  params?: StatusRuleParams;
}

export const getMonitorSummary = ({
  monitorInfo,
  locationId,
  configId,
  tz,
  dateFormat,
  statusMessage,
  checks,
  params,
}: MonitorSummaryData): MonitorSummaryStatusRule => {
  const { downThreshold } = getConditionType(params?.condition);
  const monitorName = monitorInfo?.monitor?.name ?? monitorInfo?.monitor?.id;
  const locationName = monitorInfo?.observer?.geo?.name ?? UNNAMED_LOCATION;
  const formattedLocationName = Array.isArray(locationName)
    ? locationName.join(' | ')
    : locationName;
  const checkedAt = moment(monitorInfo?.['@timestamp'])
    .tz(tz || 'UTC')
    .format(dateFormat);
  const typeToLabelMap: Record<string, string> = {
    http: 'HTTP',
    tcp: 'TCP',
    icmp: 'ICMP',
    browser: i18n.translate('xpack.synthetics.alertRules.monitorStatus.browser.label', {
      defaultMessage: 'browser',
    }),
  };
  const typeToUrlLabelMap: Record<string, string> = {
    http: 'URL',
    tcp: HOST_LABEL,
    icmp: HOST_LABEL,
    browser: 'URL',
  };
  const monitorType = monitorInfo.monitor?.type;
  const stateId = monitorInfo.state?.id;

  return {
    checkedAt,
    locationId: locationId?.join?.(' | ') ?? '',
    configId,
    monitorUrl: monitorInfo.url?.full || UNAVAILABLE_LABEL,
    monitorUrlLabel: typeToUrlLabelMap[monitorType] || 'URL',
    monitorId: monitorInfo.monitor?.id,
    monitorName,
    monitorType: typeToLabelMap[monitorInfo.monitor?.type] || monitorInfo.monitor?.type,
    lastErrorMessage: monitorInfo.error?.message!,
    locationName: formattedLocationName,
    locationNames: formattedLocationName,
    hostName: monitorInfo.agent?.name!,
    status: statusMessage,
    stateId,
    [ALERT_REASON_MSG]: getReasonMessage({
      name: monitorName,
      location: formattedLocationName,
      status: statusMessage,
      checks,
      params,
    }),
    checks,
    downThreshold,
    timestamp: monitorInfo['@timestamp'],
    monitorTags: monitorInfo.tags,
  };
};

export const getUngroupedReasonMessage = ({
  statusConfigs,
  monitorName,
  params,
  status = DOWN_LABEL,
}: {
  statusConfigs: AlertStatusMetaData[];
  monitorName: string;
  params: StatusRuleParams;
  status?: string;
  checks?: {
    downWithinXChecks: number;
    down: number;
  };
}) => {
  const { useLatestChecks, numberOfChecks, timeWindow, downThreshold, locationsThreshold } =
    getConditionType(params.condition);

  return i18n.translate(
    'xpack.synthetics.alertRules.monitorStatus.reasonMessage.location.ungrouped.multiple',
    {
      defaultMessage: `Monitor "{name}" is {status} {locationDetails}. Alert when down {threshold} {threshold, plural, one {time} other {times}} {condition} from at least {locationsThreshold} {locationsThreshold, plural, one {location} other {locations}}.`,
      values: {
        name: monitorName,
        status,
        threshold: downThreshold,
        locationsThreshold,
        condition: useLatestChecks
          ? i18n.translate(
              'xpack.synthetics.alertRules.monitorStatus.reasonMessage.condition.latestChecks',
              {
                defaultMessage: 'out of the last {numberOfChecks} checks',
                values: { numberOfChecks },
              }
            )
          : i18n.translate(
              'xpack.synthetics.alertRules.monitorStatus.reasonMessage.condition.timeWindow',
              {
                defaultMessage: 'within the last {time} {unit}',
                values: {
                  time: timeWindow.size,
                  unit: getTimeUnitLabel(timeWindow),
                },
              }
            ),
        locationDetails: statusConfigs
          .map((c) => {
            return i18n.translate(
              'xpack.synthetics.alertRules.monitorStatus.reasonMessage.locationDetails',
              {
                defaultMessage:
                  '{downCount} {downCount, plural, one {time} other {times}} from {locName}',
                values: {
                  locName: c.ping.observer.geo?.name,
                  downCount: useLatestChecks ? c.checks?.downWithinXChecks : c.checks?.down,
                },
              }
            );
          })
          .join(' | '),
      },
    }
  );
};

export const getReasonMessage = ({
  name,
  status,
  location,
  checks,
  params,
}: {
  name: string;
  location: string;
  status: string;
  checks?: {
    downWithinXChecks: number;
    down: number;
  };
  params?: StatusRuleParams;
}) => {
  const { useTimeWindow, numberOfChecks, locationsThreshold, downThreshold } = getConditionType(
    params?.condition
  );
  if (useTimeWindow) {
    return getReasonMessageForTimeWindow({
      name,
      location,
      status,
      params,
    });
  }
  return i18n.translate('xpack.synthetics.alertRules.monitorStatus.reasonMessage.new', {
    defaultMessage: `Monitor "{name}" from {location} is {status}. {checksSummary}Alert when {downThreshold} out of the last {numberOfChecks} checks are down from at least {locationsThreshold} {locationsThreshold, plural, one {location} other {locations}}.`,
    values: {
      name,
      status,
      location,
      downThreshold,
      locationsThreshold,
      numberOfChecks,
      checksSummary: checks
        ? i18n.translate('xpack.synthetics.alertRules.monitorStatus.reasonMessage.checksSummary', {
            defaultMessage:
              'Monitor is down {downChecks} {downChecks, plural, one {time} other {times}} within the last {numberOfChecks} checks. ',
            values: {
              downChecks: checks.downWithinXChecks,
              numberOfChecks,
            },
          })
        : '',
    },
  });
};

export const getReasonMessageForTimeWindow = ({
  name,
  location,
  status = DOWN_LABEL,
  params,
}: {
  name: string;
  location: string;
  status?: string;
  params?: StatusRuleParams;
}) => {
  const { timeWindow, locationsThreshold, downThreshold } = getConditionType(params?.condition);
  return i18n.translate('xpack.synthetics.alertRules.monitorStatus.reasonMessage.timeBased', {
    defaultMessage: `Monitor "{name}" from {location} is {status}. Alert when {downThreshold} checks are down within the last {size} {unitLabel} from at least {locationsThreshold} {locationsThreshold, plural, one {location} other {locations}}.`,
    values: {
      name,
      status,
      location,
      downThreshold,
      unitLabel: getTimeUnitLabel(timeWindow),
      locationsThreshold,
      size: timeWindow.size,
    },
  });
};

export const DOWN_LABEL = i18n.translate('xpack.synthetics.alerts.monitorStatus.downLabel', {
  defaultMessage: `down`,
});

export const UNAVAILABLE_LABEL = i18n.translate(
  'xpack.synthetics.alertRules.monitorStatus.unavailableUrlLabel',
  {
    defaultMessage: `(unavailable)`,
  }
);

export const HOST_LABEL = i18n.translate('xpack.synthetics.alertRules.monitorStatus.host.label', {
  defaultMessage: 'Host',
});
