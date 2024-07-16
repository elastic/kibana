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
import {
  IRuleTypeAlerts,
  ActionGroupIdsOf,
  AlertInstanceContext as AlertContext,
  AlertInstanceState as AlertState,
} from '@kbn/alerting-plugin/server';
import { addSpaceIdToPath } from '@kbn/spaces-plugin/common';
import { i18n } from '@kbn/i18n';
import { fromKueryExpression, toElasticsearchQuery } from '@kbn/es-query';
import { legacyExperimentalFieldMap, ObservabilityUptimeAlert } from '@kbn/alerts-as-data-utils';
import { PublicAlertsClient } from '@kbn/alerting-plugin/server/alerts_client/types';
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
import type { MonitorSummaryStatusRule } from './status_rule/types';

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

export const getErrorDuration = (startedAt: Moment, endsAt: Moment) => {
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
  alertsClient,
  basePath,
  spaceId,
  staleDownConfigs,
  upConfigs,
  dateFormat,
  tz,
}: {
  alertsClient: PublicAlertsClient<
    ObservabilityUptimeAlert,
    AlertState,
    AlertContext,
    ActionGroupIdsOf<MonitorStatusActionGroup>
  >;
  basePath?: IBasePath;
  spaceId?: string;
  staleDownConfigs: AlertOverviewStatus['staleDownConfigs'];
  upConfigs: AlertOverviewStatus['upConfigs'];
  dateFormat: string;
  tz: string;
}) => {
  const recoveredAlerts = alertsClient.getRecoveredAlerts() ?? [];
  for (const recoveredAlert of recoveredAlerts) {
    const recoveredAlertId = recoveredAlert.alert.getId();
    const alertUuid = recoveredAlert.alert.getUuid();

    const state = recoveredAlert.alert.getState();

    let recoveryReason = '';
    let recoveryStatus = i18n.translate(
      'xpack.synthetics.alerts.monitorStatus.defaultRecovery.status',
      {
        defaultMessage: `has recovered`,
      }
    );
    let isUp = false;
    let linkMessage = '';
    let monitorSummary: MonitorSummaryStatusRule | null = null;
    let lastErrorMessage;

    if (state?.idWithLocation && staleDownConfigs[state.idWithLocation]) {
      const { idWithLocation, locationId } = state;
      const downConfig = staleDownConfigs[idWithLocation];
      const { ping, configId } = downConfig;
      monitorSummary = getMonitorSummary(
        ping,
        RECOVERED_LABEL,
        locationId,
        configId,
        dateFormat,
        tz
      );
      lastErrorMessage = monitorSummary.lastErrorMessage;

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
            defaultMessage: `the monitor has been deleted`,
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
            defaultMessage: `this location has been removed from the monitor`,
          }
        );
      }
    }

    if (state?.idWithLocation && upConfigs[state.idWithLocation]) {
      const { idWithLocation, configId, locationId } = state;
      // pull the last error from state, since it is not available on the up ping
      lastErrorMessage = state.lastErrorMessage;

      const upConfig = upConfigs[idWithLocation];
      isUp = Boolean(upConfig) || false;
      const ping = upConfig.ping;

      monitorSummary = getMonitorSummary(
        ping,
        RECOVERED_LABEL,
        locationId,
        configId,
        dateFormat,
        tz
      );

      // When alert is flapping, the stateId is not available on ping.state.ends.id, use state instead
      const stateId = ping.state?.ends?.id || state.stateId;
      const upTimestamp = ping['@timestamp'];
      const checkedAt = moment(upTimestamp).tz(tz).format(dateFormat);
      recoveryStatus = i18n.translate('xpack.synthetics.alerts.monitorStatus.upCheck.status', {
        defaultMessage: `is now up`,
      });
      recoveryReason = i18n.translate(
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
          locationId,
          stateId,
        });
        linkMessage = getFullViewInAppMessage(basePath, spaceId, relativeViewInAppUrl);
      }
    }

    const context = {
      ...state,
      ...(monitorSummary ? monitorSummary : {}),
      lastErrorMessage,
      recoveryStatus,
      linkMessage,
      ...(isUp ? { status: 'up' } : {}),
      ...(recoveryReason ? { [RECOVERY_REASON]: recoveryReason } : {}),
      ...(basePath && spaceId && alertUuid
        ? { [ALERT_DETAILS_URL]: getAlertDetailsUrl(basePath, spaceId, alertUuid) }
        : {}),
    };
    alertsClient.setAlertData({ id: recoveredAlertId, context });
  }
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

export const SyntheticsRuleTypeAlertDefinition: IRuleTypeAlerts = {
  context: SYNTHETICS_RULE_TYPES_ALERT_CONTEXT,
  mappings: { fieldMap: syntheticsRuleTypeFieldMap },
  useLegacyAlerts: true,
};
