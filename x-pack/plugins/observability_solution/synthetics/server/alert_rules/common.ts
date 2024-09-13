/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import moment from 'moment';
import { isRight } from 'fp-ts/lib/Either';
import Mustache from 'mustache';
import { IBasePath } from '@kbn/core/server';
import {
  IRuleTypeAlerts,
  ActionGroupIdsOf,
  AlertInstanceContext as AlertContext,
  AlertInstanceState as AlertState,
} from '@kbn/alerting-plugin/server';
import { addSpaceIdToPath } from '@kbn/spaces-plugin/common';
import { i18n } from '@kbn/i18n';
import { fromKueryExpression, toElasticsearchQuery } from '@kbn/es-query';
import { legacyExperimentalFieldMap } from '@kbn/alerts-as-data-utils';
import {
  PublicAlertsClient,
  RecoveredAlertData,
} from '@kbn/alerting-plugin/server/alerts_client/types';
import { TimeWindow } from '../../common/rules/status_rule';
import { syntheticsRuleFieldMap } from '../../common/rules/synthetics_rule_field_map';
import { combineFiltersAndUserSearch, stringifyKueries } from '../../common/lib';
import {
  MonitorStatusActionGroup,
  SYNTHETICS_RULE_TYPES_ALERT_CONTEXT,
} from '../../common/constants/synthetics_alerts';
import { getUptimeIndexPattern, IndexPatternTitleAndFields } from '../queries/get_index_pattern';
import { StatusCheckFilters } from '../../common/runtime_types';
import { SyntheticsEsClient } from '../lib';
import { getMonitorSummary } from './status_rule/message_utils';
import {
  SyntheticsCommonState,
  SyntheticsCommonStateCodec,
} from '../../common/runtime_types/alert_rules/common';
import { getSyntheticsErrorRouteFromMonitorId } from '../../common/utils/get_synthetics_monitor_url';
import { ALERT_DETAILS_URL, RECOVERY_REASON } from './action_variables';
import { AlertOverviewStatus } from './status_rule/status_rule_executor';
import type { MonitorSummaryStatusRule, MonitorStatusAlertDocument } from './status_rule/types';
import { StatusRuleCondition, getConditionType } from '../../common/rules/status_rule';
import { SyntheticsMonitorStatusAlertState } from '../../common/runtime_types/alert_rules/common';

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
      defaultMessage: `- Relative link`,
    }
  );
  const absoluteLinkLabel = i18n.translate(
    'xpack.synthetics.alerts.monitorStatus.absoluteLink.label',
    {
      defaultMessage: `- Link`,
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
  stateId,
  locationId,
}: {
  configId: string;
  stateId: string;
  locationId: string;
}) => {
  const relativeViewInAppUrl = getSyntheticsErrorRouteFromMonitorId({
    configId,
    stateId,
    locationId,
  });

  return relativeViewInAppUrl;
};

export const setRecoveredAlertsContext = ({
  alertsClient,
  basePath,
  spaceId,
  staleDownConfigs = {},
  upConfigs,
  dateFormat,
  tz,
  condition,
  groupByLocation,
}: {
  alertsClient: PublicAlertsClient<
    MonitorStatusAlertDocument,
    SyntheticsMonitorStatusAlertState,
    AlertContext,
    ActionGroupIdsOf<MonitorStatusActionGroup>
  >;
  basePath?: IBasePath;
  spaceId?: string;
  staleDownConfigs: AlertOverviewStatus['staleDownConfigs'];
  upConfigs: AlertOverviewStatus['upConfigs'];
  dateFormat: string;
  tz: string;
  condition?: StatusRuleCondition;
  groupByLocation: boolean;
}) => {
  const { locationsThreshold, downThreshold, numberOfChecks } = getConditionType(condition);
  const recoveredAlerts = alertsClient.getRecoveredAlerts() ?? [];
  for (const recoveredAlert of recoveredAlerts) {
    const recoveredAlertId = recoveredAlert.alert.getId();
    const alertUuid = recoveredAlert.alert.getUuid();
    const alertHit = recoveredAlert.hit;
    const alertState = recoveredAlert.alert.getState();
    const configId = alertHit?.configId;
    const locationIds = alertHit?.['location.id'] ? [alertHit?.['location.id']].flat() : [];
    const locationName = alertHit?.['observer.geo.name']
      ? [alertHit?.['observer.geo.name']].flat()
      : [];
    let syntheticsStateId = alertHit?.['monitor.state.id'];

    let recoveryReason = i18n.translate(
      'xpack.synthetics.alerts.monitorStatus.defaultRecovery.reason',
      {
        defaultMessage: `the alert condition is no longer met`,
      }
    );
    let recoveryStatus = i18n.translate(
      'xpack.synthetics.alerts.monitorStatus.defaultRecovery.status',
      {
        defaultMessage: `has recovered`,
      }
    );
    let isUp = false;
    let linkMessage = getDefaultLinkMessage({
      basePath,
      spaceId,
      syntheticsStateId,
      configId,
      locationId: locationIds[0],
    });
    let monitorSummary: MonitorSummaryStatusRule = getDefaultRecoveredSummary({
      recoveredAlert,
      tz,
      dateFormat,
      numberOfChecks,
      locationsThreshold,
      downThreshold,
    });
    let lastErrorMessage = alertHit?.['error.message'];

    if (!groupByLocation) {
      const formattedLocationNames = locationName.join(' | ');
      const formattedLocationIds = locationIds.join(' | ');
      monitorSummary.locationNames = formattedLocationNames;
      monitorSummary.locationName = formattedLocationNames;
      monitorSummary.locationId = formattedLocationIds;
    }

    if (recoveredAlertId && locationIds && staleDownConfigs[recoveredAlertId]) {
      const summary = getDeletedMonitorOrLocationSummary({
        staleDownConfigs,
        recoveredAlertId,
        locationIds,
        dateFormat,
        tz,
        numberOfChecks,
        locationsThreshold,
        downThreshold,
      });
      if (summary) {
        monitorSummary = {
          ...monitorSummary,
          ...summary.monitorSummary,
        };
        recoveryStatus = summary.recoveryStatus;
        recoveryReason = summary.recoveryReason;
        lastErrorMessage = summary.lastErrorMessage;
        syntheticsStateId = summary.stateId ? summary.stateId : syntheticsStateId;
      }
      // Cannot display link message for deleted monitors or deleted locations
      linkMessage = '';
    }

    if (configId && recoveredAlertId && locationIds && upConfigs[recoveredAlertId]) {
      const summary = getUpMonitorRecoverySummary({
        upConfigs,
        recoveredAlertId,
        alertHit,
        locationIds,
        configId,
        basePath,
        spaceId,
        dateFormat,
        tz,
        downThreshold,
        numberOfChecks,
        locationsThreshold,
      });
      if (summary) {
        monitorSummary = {
          ...monitorSummary,
          ...summary.monitorSummary,
        };
        recoveryStatus = summary.recoveryStatus;
        recoveryReason = summary.recoveryReason;
        isUp = summary.isUp;
        lastErrorMessage = summary.lastErrorMessage;
        linkMessage = summary.linkMessage ? summary.linkMessage : linkMessage;
        syntheticsStateId = summary.stateId ? summary.stateId : syntheticsStateId;
      }
    }

    const context = {
      ...alertState,
      ...(monitorSummary ? monitorSummary : {}),
      locationId: locationIds.join(' | '),
      idWithLocation: recoveredAlertId,
      lastErrorMessage,
      recoveryStatus,
      linkMessage,
      stateId: syntheticsStateId,
      ...(isUp ? { status: 'up' } : {}),
      ...(recoveryReason
        ? {
            [RECOVERY_REASON]: recoveryReason,
          }
        : {}),
      ...(basePath && spaceId && alertUuid
        ? { [ALERT_DETAILS_URL]: getAlertDetailsUrl(basePath, spaceId, alertUuid) }
        : {}),
    };
    alertsClient.setAlertData({ id: recoveredAlertId, context });
  }
};

export const getDefaultLinkMessage = ({
  basePath,
  spaceId,
  syntheticsStateId,
  configId,
  locationId,
}: {
  basePath?: IBasePath;
  spaceId?: string;
  syntheticsStateId?: string;
  configId?: string;
  locationId?: string;
}) => {
  if (basePath && spaceId && syntheticsStateId && configId && locationId) {
    const relativeViewInAppUrl = getRelativeViewInAppUrl({
      configId,
      locationId,
      stateId: syntheticsStateId,
    });
    return getFullViewInAppMessage(basePath, spaceId, relativeViewInAppUrl);
  } else {
    return '';
  }
};

export const getDefaultRecoveredSummary = ({
  recoveredAlert,
  tz,
  dateFormat,
  numberOfChecks,
  locationsThreshold,
  downThreshold,
}: {
  recoveredAlert: RecoveredAlertData<
    MonitorStatusAlertDocument,
    AlertState,
    AlertContext,
    ActionGroupIdsOf<MonitorStatusActionGroup>
  >;
  tz: string;
  dateFormat: string;
  numberOfChecks: number;
  locationsThreshold: number;
  downThreshold: number;
}) => {
  if (!recoveredAlert.hit) return; // TODO: handle this case
  const hit = recoveredAlert.hit;
  const locationId = hit['location.id'];
  const configId = hit.configId;
  return getMonitorSummary({
    monitorInfo: {
      monitor: {
        id: hit['monitor.id'],
        name: hit['monitor.name'],
        type: hit['monitor.type'],
      },
      config_id: configId,
      observer: {
        geo: {
          name: hit['observer.geo.name'] || hit['location.name'],
        },
        name: locationId,
      },
      agent: {
        name: hit['agent.name'] || '',
      },
      '@timestamp': String(hit['@timestamp']),
      ...(hit['error.message'] ? { error: { message: hit['error.message'] } } : {}),
      ...(hit['url.full'] ? { url: { full: hit['url.full'] } } : {}),
    },
    statusMessage: RECOVERED_LABEL,
    locationId,
    configId,
    dateFormat,
    tz,
    downThreshold,
    numberOfChecks,
    locationsThreshold,
  });
};

export const getDeletedMonitorOrLocationSummary = ({
  staleDownConfigs,
  recoveredAlertId,
  locationIds,
  dateFormat,
  tz,
  numberOfChecks,
  locationsThreshold,
  downThreshold,
}: {
  staleDownConfigs: AlertOverviewStatus['staleDownConfigs'];
  recoveredAlertId: string;
  locationIds: string[];
  dateFormat: string;
  tz: string;
  numberOfChecks: number;
  locationsThreshold: number;
  downThreshold: number;
}) => {
  const downConfig = staleDownConfigs[recoveredAlertId];
  const { ping } = downConfig;
  const monitorSummary = getMonitorSummary({
    monitorInfo: ping,
    statusMessage: RECOVERED_LABEL,
    locationId: locationIds,
    configId: downConfig.configId,
    dateFormat,
    tz,
    downThreshold,
    numberOfChecks,
    locationsThreshold,
  });
  const lastErrorMessage = monitorSummary.lastErrorMessage;

  if (downConfig.isDeleted) {
    return {
      lastErrorMessage,
      monitorSummary,
      stateId: ping.state?.id,
      recoveryStatus: i18n.translate('xpack.synthetics.alerts.monitorStatus.deleteMonitor.status', {
        defaultMessage: `has been deleted`,
      }),
      recoveryReason: i18n.translate('xpack.synthetics.alerts.monitorStatus.deleteMonitor.status', {
        defaultMessage: `has been deleted`,
      }),
    };
  } else if (downConfig.isLocationRemoved) {
    return {
      monitorSummary,
      lastErrorMessage,
      stateId: ping.state?.id,
      recoveryStatus: i18n.translate(
        'xpack.synthetics.alerts.monitorStatus.removedLocation.status',
        {
          defaultMessage: `has recovered`,
        }
      ),
      recoveryReason: i18n.translate(
        'xpack.synthetics.alerts.monitorStatus.removedLocation.reason',
        {
          defaultMessage: `this location has been removed from the monitor`,
        }
      ),
    };
  }
};

export const getUpMonitorRecoverySummary = ({
  upConfigs,
  recoveredAlertId,
  alertHit,
  locationIds,
  configId,
  basePath,
  spaceId,
  dateFormat,
  tz,
  downThreshold,
  numberOfChecks,
  locationsThreshold,
}: {
  upConfigs: AlertOverviewStatus['upConfigs'];
  recoveredAlertId: string;
  alertHit: any;
  locationIds: string[];
  configId: string;
  basePath?: IBasePath;
  spaceId?: string;
  dateFormat: string;
  tz: string;
  downThreshold: number;
  numberOfChecks: number;
  locationsThreshold: number;
}) => {
  // pull the last error from state, since it is not available on the up ping
  const lastErrorMessage = alertHit?.['error.message'];
  let linkMessage = '';

  const upConfig = upConfigs[recoveredAlertId];
  const isUp = Boolean(upConfig) || false;
  const ping = upConfig.ping;

  const monitorSummary = getMonitorSummary({
    monitorInfo: ping,
    statusMessage: RECOVERED_LABEL,
    locationId: locationIds,
    configId,
    dateFormat,
    tz,
    downThreshold,
    numberOfChecks,
    locationsThreshold,
  });

  // When alert is flapping, the stateId is not available on ping.state.ends.id, use state instead
  const stateId = ping.state?.ends?.id;
  const upTimestamp = ping['@timestamp'];
  const checkedAt = moment(upTimestamp).tz(tz).format(dateFormat);
  const recoveryStatus = i18n.translate('xpack.synthetics.alerts.monitorStatus.upCheck.status', {
    defaultMessage: `is now up`,
  });
  const recoveryReason = i18n.translate(
    'xpack.synthetics.alerts.monitorStatus.upCheck.reasonWithoutDuration',
    {
      defaultMessage: `the monitor is now up again. It ran successfully at {checkedAt}`,
      values: {
        checkedAt,
      },
    }
  );

  if (basePath && spaceId && stateId) {
    const relativeViewInAppUrl = getRelativeViewInAppUrl({
      configId,
      locationId: locationIds[0],
      stateId,
    });
    linkMessage = getFullViewInAppMessage(basePath, spaceId, relativeViewInAppUrl);
  }

  return {
    monitorSummary,
    lastErrorMessage,
    recoveryStatus,
    recoveryReason,
    isUp,
    linkMessage,
    stateId,
  };
};

export const RECOVERED_LABEL = i18n.translate('xpack.synthetics.monitorStatus.recoveredLabel', {
  defaultMessage: 'recovered',
});

export const formatFilterString = async (
  syntheticsEsClient: SyntheticsEsClient,
  filters?: StatusCheckFilters,
  search?: string
) =>
  await generateFilterDSL(
    () =>
      getUptimeIndexPattern({
        syntheticsEsClient,
      }),
    filters,
    search
  );

export const hasFilters = (filters?: StatusCheckFilters) => {
  if (!filters) return false;
  for (const list of Object.values(filters)) {
    if (list.length > 0) {
      return true;
    }
  }
  return false;
};

export const generateFilterDSL = async (
  getIndexPattern: () => Promise<IndexPatternTitleAndFields | undefined>,
  filters?: StatusCheckFilters,
  search?: string
) => {
  const filtersExist = hasFilters(filters);
  if (!filtersExist && !search) return undefined;

  let filterString = '';
  if (filtersExist) {
    filterString = stringifyKueries(new Map(Object.entries(filters ?? {})));
  }

  const combinedString = combineFiltersAndUserSearch(filterString, search);

  return toElasticsearchQuery(fromKueryExpression(combinedString ?? ''), await getIndexPattern());
};

export const syntheticsRuleTypeFieldMap = {
  ...syntheticsRuleFieldMap,
  ...legacyExperimentalFieldMap,
};

export const SyntheticsRuleTypeAlertDefinition: IRuleTypeAlerts<MonitorStatusAlertDocument> = {
  context: SYNTHETICS_RULE_TYPES_ALERT_CONTEXT,
  mappings: { fieldMap: syntheticsRuleTypeFieldMap },
  useLegacyAlerts: true,
  shouldWrite: true,
};

export function getTimeUnitLabel(timeWindow: TimeWindow) {
  const { size: timeValue = 1, unit: timeUnit } = timeWindow;
  switch (timeUnit) {
    case 's':
      return i18n.translate('xpack.synthetics.timeUnits.secondLabel', {
        defaultMessage: '{timeValue, plural, one {second} other {seconds}}',
        values: { timeValue },
      });
    case 'm':
      return i18n.translate('xpack.synthetics.timeUnits.minuteLabel', {
        defaultMessage: '{timeValue, plural, one {minute} other {minutes}}',
        values: { timeValue },
      });
    case 'h':
      return i18n.translate('xpack.synthetics.timeUnits.hourLabel', {
        defaultMessage: '{timeValue, plural, one {hour} other {hours}}',
        values: { timeValue },
      });
    case 'd':
      return i18n.translate('xpack.synthetics.timeUnits.dayLabel', {
        defaultMessage: '{timeValue, plural, one {day} other {days}}',
        values: { timeValue },
      });
  }
}
