/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import { i18n } from '@kbn/i18n';
import { ALERT_REASON } from '@kbn/rule-data-utils';
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
  configId: monitorSummary.configId,
});

export const getMonitorSummary = (
  monitorInfo: OverviewPing,
  statusMessage: string,
  locationId: string,
  configId: string,
  dateFormat: string,
  tz: string
): MonitorSummaryStatusRule => {
  const monitorName = monitorInfo.monitor?.name ?? monitorInfo.monitor?.id;
  const observerLocation = monitorInfo.observer?.geo?.name ?? UNNAMED_LOCATION;
  const checkedAt = moment(monitorInfo['@timestamp']).tz(tz).format(dateFormat);
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
    }),
  };
};

export const getReasonMessage = ({
  name,
  status,
  location,
  timestamp,
}: {
  name: string;
  location: string;
  status: string;
  timestamp: string;
}) => {
  const checkedAt = moment(timestamp).format('LLL');

  return i18n.translate('xpack.synthetics.alertRules.monitorStatus.reasonMessage', {
    defaultMessage: `Monitor "{name}" from {location} is {status}. Checked at {checkedAt}.`,
    values: {
      name,
      status,
      location,
      checkedAt,
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
