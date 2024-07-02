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
import { LifecycleAlertServices } from '@kbn/rule-registry-plugin/server';
import { i18n } from '@kbn/i18n';
import { RuleExecutorServices } from '@kbn/alerting-plugin/server';
import { periodToMs } from '../../routes/overview_status/overview_status';
import { getMonitorToPing } from './utils';
import { queryMonitorLastRun } from './queries/query_monitor_last_run';
import { MonitorSummaryStatusRule, StatusRuleExecutorOptions } from './types';
import {
  getAlertDetailsUrl,
  getFullViewInAppMessage,
  getRelativeViewInAppUrl,
  getTimeUnitLabel,
  getViewInAppUrl,
} from '../common';
import {
  DOWN_LABEL,
  getMonitorAlertDocument,
  getMonitorSummary,
  PENDING_LABEL,
} from './message_utils';
import {
  AlertStatusMetaDataCodec,
  AlertStatusResponse,
  queryMonitorStatusAlert,
  StatusConfigs,
} from './queries/query_monitor_status_alert';
import { parseArrayFilters } from '../../routes/common';
import { SyntheticsServerSetup } from '../../types';
import { UptimeEsClient } from '../../lib';
import { SYNTHETICS_INDEX_PATTERN } from '../../../common/constants';
import {
  getAllMonitors,
  processMonitors,
} from '../../saved_objects/synthetics_monitor/get_all_monitors';
import { getConditionType, StatusRuleParams } from '../../../common/rules/status_rule';
import {
  ConfigKey,
  EncryptedSyntheticsMonitorAttributes,
  OverviewPendingStatusMetaData,
  OverviewPing,
} from '../../../common/runtime_types';
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

export type PendingConfigs = Record<string, OverviewPendingStatusMetaData>;

type Services = RuleExecutorServices &
  LifecycleAlertServices<Record<string, any>, Record<string, any>, string>;

export class StatusRuleExecutor {
  previousStartedAt: Date | null;
  params: StatusRuleParams;
  esClient: UptimeEsClient;
  soClient: SavedObjectsClientContract;
  server: SyntheticsServerSetup;
  syntheticsMonitorClient: SyntheticsMonitorClient;
  monitors: Array<SavedObjectsFindResult<EncryptedSyntheticsMonitorAttributes>> = [];
  hasCustomCondition: boolean;
  monitorLocationsMap: Record<string, string[]>; // monitorId: locationIds
  dateFormat?: string;
  tz?: string;
  services: Services;
  options: StatusRuleExecutorOptions;

  constructor(
    previousStartedAt: Date | null,
    p: StatusRuleParams,
    soClient: SavedObjectsClientContract,
    scopedClient: ElasticsearchClient,
    server: SyntheticsServerSetup,
    syntheticsMonitorClient: SyntheticsMonitorClient,
    services: Services,
    options: StatusRuleExecutorOptions
  ) {
    this.previousStartedAt = previousStartedAt;
    this.params = p;
    this.soClient = soClient;
    this.esClient = new UptimeEsClient(this.soClient, scopedClient, {
      heartbeatIndices: SYNTHETICS_INDEX_PATTERN,
    });
    this.server = server;
    this.syntheticsMonitorClient = syntheticsMonitorClient;
    this.hasCustomCondition = !isEmpty(this.params);
    this.monitorLocationsMap = {};
    this.services = services;
    this.options = options;
  }

  async init() {
    const { uiSettingsClient } = this.services;
    this.dateFormat = await uiSettingsClient.get('dateFormat');
    const timezone = await uiSettingsClient.get('dateFormat:tz');
    this.tz = timezone === 'Browser' ? 'UTC' : timezone;
  }

  async getMonitors() {
    const baseFilter = !this.hasCustomCondition
      ? `${monitorAttributes}.${AlertConfigKey.STATUS_ENABLED}: true`
      : '';
    const { filtersStr } = parseArrayFilters({
      filter: baseFilter,
      tags: this.params.tags,
      locations: this.params.locations,
      monitorTypes: this.params.monitorTypes,
      monitorQueryIds: this.params.monitorIds,
    });

    this.monitors = await getAllMonitors({
      soClient: this.soClient,
      filter: filtersStr,
    });

    return processMonitors(this.monitors, this.server, this.soClient, this.syntheticsMonitorClient);
  }

  async getDownChecks(prevDownConfigs: StatusConfigs = {}): Promise<AlertOverviewStatus> {
    await this.init();
    const {
      maxPeriod,
      monitorLocationIds,
      enabledMonitorQueryIds,
      monitorLocationMap,
      monitorQueryIdToConfigIdMap,
    } = await this.getMonitors();

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
        monitorQueryIdToConfigIdMap,
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
        pendingConfigs: this.filterOutRecentlyCreatedMonitors(currentStatus.pendingConfigs),
      };
    }
    const staleDownConfigs = this.markDeletedConfigs(prevDownConfigs);
    return {
      downConfigs: { ...prevDownConfigs },
      upConfigs: {},
      pendingConfigs: {},
      staleDownConfigs,
      down: 0,
      up: 0,
      pending: 0,
      enabledMonitorQueryIds,
      monitorLocationsMap: monitorLocationMap,
    };
  }

  getRange = (maxPeriod: number) => {
    let from = this.previousStartedAt
      ? moment(this.previousStartedAt).subtract(1, 'minute').toISOString()
      : 'now-2m';

    const condition = this.params.condition;
    if (condition && 'percentOfLocations' in condition.window) {
      from = moment().subtract(maxPeriod, 'milliseconds').subtract(5, 'minutes').toISOString();
      return { from, to: 'now' };
    }
    if (condition && 'numberOfChecks' in condition?.window) {
      const numberOfChecks = condition.window.numberOfChecks;
      from = moment()
        .subtract(maxPeriod * numberOfChecks, 'milliseconds')
        .subtract(20, 'minutes')
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

    const baseSummary = getMonitorSummary(
      ping,
      DOWN_LABEL,
      locationId,
      configId,
      this.dateFormat!,
      this.tz!,
      checks,
      downThreshold
    );

    const condition = this.params.condition;
    if (condition && 'time' in condition.window) {
      const time = condition.window.time;
      const { unit, size } = time;
      const checkedAt = moment(baseSummary.timestamp).format('LLL');

      baseSummary.reason = i18n.translate(
        'xpack.synthetics.alertRules.monitorStatus.reasonMessage.timeBased',
        {
          defaultMessage: `Monitor "{name}" from {location} is {status}. Checked at {checkedAt}. Alert when {downThreshold} checks are down within last {size} {unitLabel}.`,
          values: {
            name: baseSummary.monitorName,
            status: baseSummary.status,
            location: baseSummary.locationName,
            checkedAt,
            downCheck: checks?.down ?? 1,
            total: checks?.total ?? 1,
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
    percent,
  }: {
    statusConfigs: AlertStatusMetaDataCodec[];
    downThreshold: number;
    percent: number;
  }) {
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
      downThreshold
    );
    const locNames = statusConfigs.map((c) => c.ping.observer.geo?.name).join(', ');
    baseSummary.reason = i18n.translate(
      'xpack.synthetics.alertRules.monitorStatus.reasonMessage.location',
      {
        defaultMessage: `Monitor "{name}" is {status} from {noOfLocs, number} {noOfLocs, plural, one {location} other {locations}} ({locationNames}). Alert when down from {percent}% of monitor locations.`,
        values: {
          percent,
          locationNames: locNames,
          noOfLocs: statusConfigs.length,
          name: baseSummary.monitorName,
          status: baseSummary.status,
        },
      }
    );
    return baseSummary;
  }

  getPendingMonitorSummary({
    pendingConfig,
    lastRunPing,
  }: {
    pendingConfig: OverviewPendingStatusMetaData;
    lastRunPing?: OverviewPing;
  }) {
    const { configId, locationId } = pendingConfig;
    let ping = lastRunPing;
    if (!ping) {
      const monitor = this.monitors.find((m) => m.attributes.config_id === configId);
      if (monitor) {
        ping = getMonitorToPing(monitor.attributes, locationId);
      }
    }
    if (ping) {
      const baseSummary = getMonitorSummary(
        ping,
        PENDING_LABEL,
        locationId,
        configId,
        this.dateFormat!,
        this.tz!
      );
      baseSummary.reason = i18n.translate(
        'xpack.synthetics.alertRules.monitorStatus.reasonMessage.pending',
        {
          defaultMessage: `Monitor "{name}" is pending from location "{location}".`,
          values: {
            name: baseSummary.monitorName,
            location: baseSummary.locationName,
          },
        }
      );
      if (lastRunPing) {
        baseSummary.pendingLastRunAt = i18n.translate(
          'xpack.synthetics.alertRules.monitorStatus.pendingLastRunAt',
          {
            defaultMessage: ' It last ran at {time}.',
            values: {
              time: moment(lastRunPing['@timestamp']).tz(this.tz!).format(this.dateFormat!),
            },
          }
        );
      }
      return baseSummary;
    }
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
    const { alertsClient } = this.services;
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

  filterOutRecentlyCreatedMonitors(allPendingConfigs: PendingConfigs) {
    const monitors = this.monitors;

    // filter out newly created monitors
    const pendingConfigs: PendingConfigs = {};
    Object.entries(allPendingConfigs).filter(([_id, { configId }]) => {
      const monitor = monitors.find((m) => m.attributes.config_id === configId);
      if (monitor) {
        const schedule = monitor?.attributes.schedule;
        const interval = periodToMs(schedule);
        const from = moment().subtract(interval, 'ms');
        const monitorCreatedAt = moment(monitor.created_at ?? monitor.updated_at);
        if (monitorCreatedAt.isBefore(from)) {
          pendingConfigs[_id] = allPendingConfigs[_id];
        }
      }
    });

    return pendingConfigs;
  }

  async getLastRunForPendingMonitors(pendingConfigs: PendingConfigs) {
    const pendingConfigsIds: string[] = [];
    const pendingConfigsList: Array<{
      configId: string;
      locationId: string;
      monitorQueryId: string;
    }> = [];

    Object.entries(pendingConfigs).forEach(([_id, { configId, locationId, monitorQueryId }]) => {
      pendingConfigsList.push({ configId, locationId, monitorQueryId });
      pendingConfigsIds.push(configId);
    });

    const earliestMonitorCreatedAt = this.findEarliestMonitorCreatedAt(pendingConfigsIds);

    const { lastFoundRuns } = await queryMonitorLastRun(
      this.esClient,
      pendingConfigsList,
      earliestMonitorCreatedAt
    );

    return { lastFoundRuns, pendingConfigs };
  }

  findEarliestMonitorCreatedAt(pendingConfigsIds: string[]) {
    // let's first find when the earliest monitor is createdAt to narrow down the query by timestamp
    return this.monitors.reduce((earliest, monitor) => {
      // if the monitor is not in the pendingConfigs, we don't need to consider it
      if (!pendingConfigsIds.includes(monitor.attributes[ConfigKey.CONFIG_ID])) return earliest;
      const monitorCreatedAt = monitor.created_at ?? monitor.updated_at;
      const dateValue = moment(monitorCreatedAt ?? moment().subtract(1, 'day'));
      return dateValue.isBefore(earliest) ? dateValue : earliest;
    }, moment());
  }
}
