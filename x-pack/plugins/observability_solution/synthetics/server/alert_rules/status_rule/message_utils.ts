/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import { i18n } from '@kbn/i18n';
import { ALERT_REASON } from '@kbn/rule-data-utils';
import { getConditionType, StatusRuleParams, TimeWindow } from '../../../common/rules/status_rule';
import { AlertStatusMetaDataCodec } from './queries/query_monitor_status_alert';
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

export const getMonitorAlertDocument = (monitorSummary: MonitorSummaryStatusRule) => ({
  [MONITOR_ID]: monitorSummary.monitorId,
  [MONITOR_TYPE]: monitorSummary.monitorType,
  [MONITOR_NAME]: monitorSummary.monitorName,
  [URL_FULL]: monitorSummary.monitorUrl,
  [OBSERVER_GEO_NAME]: monitorSummary.locationName,
  [ERROR_MESSAGE]: monitorSummary.lastErrorMessage,
  [AGENT_NAME]: monitorSummary.hostName,
  [ALERT_REASON]: monitorSummary.reason,
  [STATE_ID]: monitorSummary.stateId,
  'location.id': monitorSummary.locationId,
  'location.name': monitorSummary.locationName,
  configId: monitorSummary.configId,
  'kibana.alert.evaluation.threshold': monitorSummary.downThreshold,
  'kibana.alert.evaluation.value': monitorSummary.checks?.down ?? 1,
  'monitor.tags': monitorSummary.monitorTags ?? [],
});

export interface MonitorSummaryData {
  monitorInfo: OverviewPing;
  statusMessage: string;
  locationId: string;
  configId: string;
  dateFormat: string;
  tz: string;
  checks?: {
    downWithinXChecks: number;
    down: number;
  };
  downThreshold: number;
  numberOfChecks: number;
  numberOfLocations: number;
}

export const getMonitorSummary = ({
  monitorInfo,
  locationId,
  configId,
  tz,
  downThreshold,
  dateFormat,
  statusMessage,
  checks = { downWithinXChecks: 1, down: 1 },
  numberOfLocations,
  numberOfChecks,
}: MonitorSummaryData): MonitorSummaryStatusRule => {
  const monitorName = monitorInfo.monitor?.name ?? monitorInfo.monitor?.id;
  const observerLocation = monitorInfo.observer?.geo?.name ?? UNNAMED_LOCATION;
  const checkedAt = moment(monitorInfo['@timestamp'])
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
  const stateId = monitorInfo.state?.id || null;

  return {
    checkedAt,
    locationId,
    configId,
    monitorUrl: monitorInfo.url?.full || UNAVAILABLE_LABEL,
    monitorUrlLabel: typeToUrlLabelMap[monitorType] || 'URL',
    monitorId: monitorInfo.monitor?.id,
    monitorName,
    monitorType: typeToLabelMap[monitorInfo.monitor?.type] || monitorInfo.monitor?.type,
    lastErrorMessage: monitorInfo.error?.message!,
    locationName: monitorInfo.observer?.geo?.name!,
    hostName: monitorInfo.agent?.name!,
    status: statusMessage,
    stateId,
    [ALERT_REASON_MSG]: getReasonMessage({
      name: monitorName,
      location: observerLocation,
      status: statusMessage,
      timestamp: monitorInfo['@timestamp'],
      checks,
      downThreshold,
      numberOfLocations,
      numberOfChecks,
    }),
    checks,
    downThreshold,
    timestamp: monitorInfo['@timestamp'],
    monitorTags: monitorInfo.tags,
    locationNames: monitorInfo.observer?.geo?.name!,
  };
};

export const getUngroupedReasonMessage = ({
  statusConfigs,
  monitorName,
  params,
  status = DOWN_LABEL,
}: {
  statusConfigs: AlertStatusMetaDataCodec[];
  monitorName: string;
  status?: string;
  params: StatusRuleParams;
}) => {
  const { isChecksBased, numberOfChecks, timeWindow, downThreshold, numberOfLocations } =
    getConditionType(params.condition);

  if (statusConfigs.length === 1) {
    const locNames = statusConfigs.map((c) => c.ping.observer.geo?.name!);
    return i18n.translate(
      'xpack.synthetics.alertRules.monitorStatus.reasonMessage.location.ungrouped',
      {
        defaultMessage: `Monitor "{name}" is {status} from {locName}. Alert when down {threshold} {threshold, plural, one {time} other {times}}.`,
        values: {
          locName: locNames[0],
          name: monitorName,
          status,
          threshold: downThreshold,
        },
      }
    );
  } else {
    return i18n.translate(
      'xpack.synthetics.alertRules.monitorStatus.reasonMessage.location.ungrouped.multiple',
      {
        defaultMessage: `Monitor "{name}" is {status}{locationDetails}. Alert when down => {threshold} {threshold, plural, one {time} other {times}} {condition} from at least {numberOfLocations} {numberOfLocations, plural, one {location} other {locations}}.`,
        values: {
          name: monitorName,
          status,
          threshold: downThreshold,
          numberOfLocations,
          condition: isChecksBased
            ? i18n.translate(
                'xpack.synthetics.alertRules.monitorStatus.reasonMessage.condition.latestChecks',
                {
                  defaultMessage: 'within the last {checks} checks',
                  values: { checks: numberOfChecks },
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
                    ' {downCount} {downCount, plural, one {time} other {times}} from {locName}',
                  values: {
                    locName: c.ping.observer.geo?.name,
                    downCount: isChecksBased ? c.checks?.downWithinXChecks : c.checks?.down,
                  },
                }
              );
            })
            .join(' | '),
        },
      }
    );
  }
};

export const getReasonMessage = ({
  name,
  status,
  location,
  timestamp,
  checks,
  downThreshold,
  numberOfLocations,
  numberOfChecks,
}: {
  name: string;
  location: string;
  status: string;
  timestamp: string;
  checks?: {
    downWithinXChecks: number;
    down: number;
  };
  downThreshold: number;
  numberOfLocations: number;
  numberOfChecks: number;
}) => {
  const checkedAt = moment(timestamp).format('LLL');

  return i18n.translate('xpack.synthetics.alertRules.monitorStatus.reasonMessage.new', {
    defaultMessage: `Monitor "{name}" from {location} is {status}. Checked at {checkedAt}. Monitor is down {downChecks} {downChecks, plural, one {time} other {times}} within the last {numberOfChecks} checks. Alert when {downThreshold} out of last {numberOfChecks} checks are down from at least {numberOfLocations} {numberOfLocations, plural, one {location} other {locations}}.`,
    values: {
      name,
      status,
      location,
      checkedAt,
      downThreshold,
      numberOfLocations,
      downChecks: checks?.downWithinXChecks ?? 1,
      numberOfChecks,
    },
  });
};

export const getReasonMessageForTimeWindow = ({
  name,
  location,
  timestamp,
  downThreshold,
  numberOfLocations,
  timeWindow,
  status = DOWN_LABEL,
}: {
  name: string;
  location: string;
  status?: string;
  timestamp: string;
  downThreshold: number;
  numberOfLocations: number;
  timeWindow: TimeWindow;
}) => {
  const checkedAt = moment(timestamp).format('LLL');

  return i18n.translate('xpack.synthetics.alertRules.monitorStatus.reasonMessage.timeBased', {
    defaultMessage: `Monitor "{name}" from {location} is {status}. Checked at {checkedAt}. Alert when {downThreshold} checks are down within the last {size} {unitLabel} from at least {numberOfLocations} {numberOfLocations, plural, one {location} other {locations}}.`,
    values: {
      name,
      status,
      location,
      checkedAt,
      downThreshold,
      unitLabel: getTimeUnitLabel(timeWindow),
      numberOfLocations,
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
