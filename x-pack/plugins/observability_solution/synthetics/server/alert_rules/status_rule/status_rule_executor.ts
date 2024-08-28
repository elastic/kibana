/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import moment from 'moment';
import {
  SavedObjectsClientContract,
  SavedObjectsFindResult,
} from '@kbn/core-saved-objects-api-server';
import { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import { isEmpty } from 'lodash';
import { i18n } from '@kbn/i18n';
import { queryFilterMonitors } from './queries/filter_monitors';
import { MonitorSummaryStatusRule, StatusRuleExecutorOptions } from './types';
import {
  getAlertDetailsUrl,
  getFullViewInAppMessage,
  getRelativeViewInAppUrl,
  getTimeUnitLabel,
  getViewInAppUrl,
} from '../common';
import { DOWN_LABEL, getMonitorAlertDocument, getMonitorSummary } from './message_utils';
import {
  AlertStatusMetaDataCodec,
  AlertStatusResponse,
  queryMonitorStatusAlert,
  StatusConfigs,
} from './queries/query_monitor_status_alert';
import { parseArrayFilters } from '../../routes/common';
import { SyntheticsServerSetup } from '../../types';
import { SyntheticsEsClient } from '../../lib';
import { SYNTHETICS_INDEX_PATTERN } from '../../../common/constants';
import {
  getAllMonitors,
  processMonitors,
} from '../../saved_objects/synthetics_monitor/get_all_monitors';
import { getConditionType, StatusRuleParams } from '../../../common/rules/status_rule';
import { ConfigKey, EncryptedSyntheticsMonitorAttributes } from '../../../common/runtime_types';
import { SyntheticsMonitorClient } from '../../synthetics_service/synthetics_monitor/synthetics_monitor_client';
import { monitorAttributes } from '../../../common/types/saved_objects';
import { AlertConfigKey } from '../../../common/constants/monitor_management';
import { ALERT_DETAILS_URL, VIEW_IN_APP_URL } from '../action_variables';
import { MONITOR_STATUS } from '../../../common/constants/synthetics_alerts';

export interface StaleDownConfig extends AlertStatusMetaDataCodec {
  isDeleted?: boolean;
  isLocationRemoved?: boolean;
}

export interface AlertOverviewStatus extends AlertStatusResponse {
  staleDownConfigs: Record<string, StaleDownConfig>;
  monitorLocationsMap: Record<string, string[]>;
}

export class StatusRuleExecutor {
  previousStartedAt: Date | null;
  params: StatusRuleParams;
  esClient: SyntheticsEsClient;
  soClient: SavedObjectsClientContract;
  server: SyntheticsServerSetup;
  syntheticsMonitorClient: SyntheticsMonitorClient;
  monitors: Array<SavedObjectsFindResult<EncryptedSyntheticsMonitorAttributes>> = [];
  hasCustomCondition: boolean;
  monitorLocationsMap: Record<string, string[]>; // monitorId: locationIds
  dateFormat?: string;
  tz?: string;
  options: StatusRuleExecutorOptions;

  constructor(
    previousStartedAt: Date | null,
    p: StatusRuleParams,
    soClient: SavedObjectsClientContract,
    scopedClient: ElasticsearchClient,
    server: SyntheticsServerSetup,
    syntheticsMonitorClient: SyntheticsMonitorClient,
    options: StatusRuleExecutorOptions
  ) {
    this.previousStartedAt = previousStartedAt;
    this.params = p;
    this.soClient = soClient;
    this.esClient = new SyntheticsEsClient(this.soClient, scopedClient, {
      heartbeatIndices: SYNTHETICS_INDEX_PATTERN,
    });
    this.server = server;
    this.syntheticsMonitorClient = syntheticsMonitorClient;
    this.hasCustomCondition = !isEmpty(this.params);
    this.monitorLocationsMap = {};
    this.options = options;
  }

  async init() {
    const { uiSettingsClient } = this.options.services;
    this.dateFormat = await uiSettingsClient.get('dateFormat');
    const timezone = await uiSettingsClient.get('dateFormat:tz');
    this.tz = timezone === 'Browser' ? 'UTC' : timezone;
  }

  async getMonitors() {
    const baseFilter = !this.hasCustomCondition
      ? `${monitorAttributes}.${AlertConfigKey.STATUS_ENABLED}: true`
      : '';

    const configIds = await queryFilterMonitors({
      spaceId: this.options.spaceId,
      esClient: this.esClient,
      ruleParams: this.params,
    });

    const { filtersStr } = parseArrayFilters({
      configIds,
      filter: baseFilter,
      tags: this.params?.tags,
      locations: this.params?.locations,
      monitorTypes: this.params?.monitorTypes,
      monitorQueryIds: this.params?.monitorIds,
      projects: this.params?.projects,
    });

    this.monitors = await getAllMonitors({
      soClient: this.soClient,
      filter: filtersStr,
    });

    return processMonitors(this.monitors);
  }

  async getDownChecks(prevDownConfigs: StatusConfigs = {}): Promise<AlertOverviewStatus> {
    await this.init();
    const { enabledMonitorQueryIds } = await this.getMonitors();

    const { maxPeriod, monitorLocationIds, monitorLocationMap } = processMonitors(this.monitors);

    this.monitorLocationsMap = monitorLocationMap;

    const range = this.getRange(maxPeriod);

    const { numberOfChecks } = getConditionType(this.params.condition);

    if (enabledMonitorQueryIds.length > 0) {
      const currentStatus = await queryMonitorStatusAlert(
        this.esClient,
        monitorLocationIds,
        range,
        enabledMonitorQueryIds,
        monitorLocationMap,
        numberOfChecks
      );

      const { downConfigs, upConfigs } = currentStatus;

      Object.keys(prevDownConfigs).forEach((locId) => {
        if (!downConfigs[locId] && !upConfigs[locId]) {
          downConfigs[locId] = prevDownConfigs[locId];
        }
      });

      const staleDownConfigs = this.markDeletedConfigs(downConfigs);

      return {
        ...currentStatus,
        staleDownConfigs,
        monitorLocationsMap: monitorLocationMap,
      };
    }
    const staleDownConfigs = this.markDeletedConfigs(prevDownConfigs);
    return {
      downConfigs: { ...prevDownConfigs },
      upConfigs: {},
      staleDownConfigs,
      enabledMonitorQueryIds,
      monitorLocationsMap: monitorLocationMap,
    };
  }

  getRange = (maxPeriod: number) => {
    let from = this.previousStartedAt
      ? moment(this.previousStartedAt).subtract(1, 'minute').toISOString()
      : 'now-2m';

    const condition = this.params.condition;
    if (condition && 'numberOfLocations' in condition.window) {
      from = moment().subtract(maxPeriod, 'milliseconds').subtract(5, 'minutes').toISOString();
      return { from, to: 'now' };
    }
    if (condition && 'numberOfChecks' in condition?.window) {
      const numberOfChecks = condition.window.numberOfChecks;
      from = moment()
        .subtract(maxPeriod * numberOfChecks, 'milliseconds')
        .subtract(5, 'minutes')
        .toISOString();
      return { from, to: 'now' };
    }

    if (condition && 'time' in condition.window) {
      const time = condition.window.time;
      const { unit, size } = time;

      from = moment().subtract(size, unit).toISOString();
    }

    return { from, to: 'now' };
  };

  markDeletedConfigs(downConfigs: StatusConfigs): Record<string, StaleDownConfig> {
    const monitors = this.monitors;
    const staleDownConfigs: AlertOverviewStatus['staleDownConfigs'] = {};
    Object.keys(downConfigs).forEach((locPlusId) => {
      const downConfig = downConfigs[locPlusId];
      const monitor = monitors.find((m) => {
        return (
          m.id === downConfig.configId ||
          m.attributes[ConfigKey.MONITOR_QUERY_ID] === downConfig.monitorQueryId
        );
      });
      if (!monitor) {
        staleDownConfigs[locPlusId] = { ...downConfig, isDeleted: true };
        delete downConfigs[locPlusId];
      } else {
        const { locations } = monitor.attributes;
        const isLocationRemoved = !locations.some((l) => l.id === downConfig.locationId);
        if (isLocationRemoved) {
          staleDownConfigs[locPlusId] = { ...downConfig, isLocationRemoved: true };
          delete downConfigs[locPlusId];
        }
      }
    });

    return staleDownConfigs;
  }

  getMonitorDownSummary({
    statusConfig,
    downThreshold,
  }: {
    statusConfig: AlertStatusMetaDataCodec;
    downThreshold: number;
  }) {
    const { ping, configId, locationId, checks } = statusConfig;
    const { numberOfChecks } = getConditionType(this.params.condition);

    const baseSummary = getMonitorSummary(
      ping,
      DOWN_LABEL,
      locationId,
      configId,
      this.dateFormat!,
      this.tz!,
      checks,
      downThreshold,
      numberOfChecks
    );

    const condition = this.params.condition;
    if (condition && 'time' in condition.window) {
      const time = condition.window.time;
      const { unit, size } = time;
      const checkedAt = moment(baseSummary.timestamp).format('LLL');

      baseSummary.reason = i18n.translate(
        'xpack.synthetics.alertRules.monitorStatus.reasonMessage.timeBased',
        {
          defaultMessage: `Monitor "{name}" from {location} is {status}. Checked at {checkedAt}. Alert when {downThreshold} checks are down within the last {size} {unitLabel}.`,
          values: {
            name: baseSummary.monitorName,
            status: baseSummary.status,
            location: baseSummary.locationName,
            checkedAt,
            downThreshold,
            unitLabel: getTimeUnitLabel(unit, size),
            size,
          },
        }
      );
    }

    return baseSummary;
  }

  getLocationBasedDownSummary({
    statusConfigs,
    downThreshold,
  }: {
    statusConfigs: AlertStatusMetaDataCodec[];
    downThreshold: number;
  }) {
    const sampleConfig = statusConfigs[0];
    const { ping, configId, locationId, checks } = sampleConfig;
    const { numberOfChecks, numberOfLocations } = getConditionType(this.params.condition);
    const baseSummary = getMonitorSummary(
      ping,
      DOWN_LABEL,
      locationId,
      configId,
      this.dateFormat!,
      this.tz!,
      checks,
      downThreshold,
      numberOfChecks
    );
    const locNames = statusConfigs.map((c) => c.ping.observer.geo?.name).join(', ');
    const thresholdReason = i18n.translate(
      'xpack.synthetics.alertRules.monitorStatus.reasonMessage.location.threshold',
      {
        defaultMessage: `Alert when monitor is down from {numberOfLocations, number} {numberOfLocations, plural, one {location} other {locations}}.`,
        values: {
          numberOfLocations,
        },
      }
    );
    baseSummary.reason = i18n.translate(
      'xpack.synthetics.alertRules.monitorStatus.reasonMessage.location',
      {
        defaultMessage: `Monitor "{name}" is {status} from {noOfLocs, number} {noOfLocs, plural, one {location} other {locations}} ({locationNames}). {thresholdReason}`,
        values: {
          locationNames: locNames,
          noOfLocs: statusConfigs.length,
          name: baseSummary.monitorName,
          status: baseSummary.status,
          thresholdReason,
        },
      }
    );
    return baseSummary;
  }

  getUngroupedDownSummary({
    statusConfigs,
    downThreshold,
  }: {
    statusConfigs: AlertStatusMetaDataCodec[];
    downThreshold: number;
  }) {
    const { isChecksBased, numberOfChecks, timeWindow } = getConditionType(this.params.condition);
    const sampleConfig = statusConfigs[0];
    const { ping, configId, locationId, checks } = sampleConfig;
    const baseSummary = getMonitorSummary(
      ping,
      DOWN_LABEL,
      locationId,
      configId,
      this.dateFormat!,
      this.tz!,
      checks,
      downThreshold,
      numberOfChecks
    );
    if (statusConfigs.length === 1) {
      const locNames = statusConfigs.map((c) => c.ping.observer.geo?.name);
      baseSummary.reason = i18n.translate(
        'xpack.synthetics.alertRules.monitorStatus.reasonMessage.location.ungrouped',
        {
          defaultMessage: `Monitor "{name}" is {status} from {locName}. Alert when down {threshold} {threshold, plural, one {time} other {times}}.`,
          values: {
            locName: locNames[0],
            name: baseSummary.monitorName,
            status: baseSummary.status,
            threshold: downThreshold,
          },
        }
      );
    } else {
      const locNames = statusConfigs.map((c) => c.ping.observer.geo?.name).join(' | ');
      baseSummary.reason = i18n.translate(
        'xpack.synthetics.alertRules.monitorStatus.reasonMessage.location.ungrouped.multiple',
        {
          defaultMessage: `Monitor "{name}" is {status}{locationDetails}. Alert when down => {threshold} {threshold, plural, one {time} other {times}} {condition}.`,
          values: {
            name: baseSummary.monitorName,
            status: baseSummary.status,
            threshold: downThreshold,
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
                      unit: getTimeUnitLabel(timeWindow.unit, timeWindow.size),
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
      baseSummary.locationNames = locNames;
    }

    return baseSummary;
  }

  scheduleAlert({
    idWithLocation,
    alertId,
    monitorSummary,
    statusConfig,
    downThreshold,
  }: {
    idWithLocation: string;
    alertId: string;
    monitorSummary: MonitorSummaryStatusRule;
    statusConfig: {
      configId: string;
      locationId: string;
      checks?: AlertStatusMetaDataCodec['checks'];
    };
    downThreshold: number;
  }) {
    const { configId, locationId, checks } = statusConfig;
    const { spaceId, startedAt } = this.options;
    const { alertsClient } = this.options.services;
    const { basePath } = this.server;
    if (!alertsClient) return;

    const { uuid: alertUuid, start } = alertsClient.report({
      id: alertId,
      actionGroup: MONITOR_STATUS.id,
    });
    const errorStartedAt = start ?? startedAt.toISOString() ?? monitorSummary.timestamp;

    let relativeViewInAppUrl = '';
    if (monitorSummary.stateId) {
      relativeViewInAppUrl = getRelativeViewInAppUrl({
        configId,
        locationId,
        stateId: monitorSummary.stateId,
      });
    }

    const context = {
      ...monitorSummary,
      idWithLocation,
      checks,
      downThreshold,
      errorStartedAt,
      linkMessage: monitorSummary.stateId
        ? getFullViewInAppMessage(basePath, spaceId, relativeViewInAppUrl)
        : '',
      [VIEW_IN_APP_URL]: getViewInAppUrl(basePath, spaceId, relativeViewInAppUrl),
      [ALERT_DETAILS_URL]: getAlertDetailsUrl(basePath, spaceId, alertUuid),
    };

    const payload = getMonitorAlertDocument(monitorSummary);

    alertsClient.setAlertData({
      id: alertId,
      payload,
      context,
    });
  }
}
