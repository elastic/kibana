/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { DEFAULT_APP_CATEGORIES } from '@kbn/core/server';
import { GetViewInAppRelativeUrlFnOpts } from '@kbn/alerting-plugin/server';
import { min } from 'lodash';
import moment from 'moment';

import datemath from '@kbn/datemath';
import { schema } from '@kbn/config-schema';
import { i18n } from '@kbn/i18n';
import { JsonObject } from '@kbn/utility-types';
import { fromKueryExpression, toElasticsearchQuery } from '@kbn/es-query';
import { ALERT_REASON } from '@kbn/rule-data-utils';
import { ActionGroupIdsOf } from '@kbn/alerting-plugin/common';
import {
  alertsLocatorID,
  AlertsLocatorParams,
  formatDurationFromTimeUnitChar,
  getAlertUrl,
  observabilityPaths,
  TimeUnitChar,
} from '@kbn/observability-plugin/common';
import { LocatorPublic } from '@kbn/share-plugin/common';
import { asyncForEach } from '@kbn/std';
import { UptimeAlertTypeFactory } from './types';
import {
  StatusCheckFilters,
  Ping,
  GetMonitorAvailabilityParams,
} from '../../../../common/runtime_types';
import { CLIENT_ALERT_TYPES, MONITOR_STATUS } from '../../../../common/constants/uptime_alerts';
import {
  updateState,
  getViewInAppUrl,
  setRecoveredAlertsContext,
  UptimeRuleTypeAlertDefinition,
} from './common';
import {
  commonMonitorStateI18,
  commonStateTranslations,
  statusCheckTranslations,
} from './translations';
import { stringifyKueries, combineFiltersAndUserSearch } from '../../../../common/lib';
import { GetMonitorAvailabilityResult } from '../requests/get_monitor_availability';
import {
  GetMonitorStatusResult,
  GetMonitorDownStatusMessageParams,
  getMonitorDownStatusMessageParams,
} from '../requests/get_monitor_status';
import { UNNAMED_LOCATION } from '../../../../common/constants';
import { getUptimeIndexPattern, IndexPatternTitleAndFields } from '../requests/get_index_pattern';
import { UMServerLibs, UptimeEsClient } from '../lib';
import {
  ACTION_VARIABLES,
  ALERT_DETAILS_URL,
  ALERT_REASON_MSG,
  MESSAGE,
  VIEW_IN_APP_URL,
} from './action_variables';
import { getMonitorRouteFromMonitorId } from '../../../../common/utils/get_monitor_url';

export type ActionGroupIds = ActionGroupIdsOf<typeof MONITOR_STATUS>;

/**
 * Returns the appropriate range for filtering the documents by `@timestamp`.
 *
 * We check monitor status by `monitor.timespan`, but need to first cut down on the number of documents
 * searched by filtering by `@timestamp`. To ensure that we catch as many documents as possible which could
 * likely contain a down monitor with a `monitor.timespan` in the given timerange, we create a filter
 * range for `@timestamp` that is the greater of either: from now to now - timerange interval - 24 hours
 * OR from now to now - rule interval
 * @param ruleScheduleLookback - string representing now minus the interval at which the rule is ran
 * @param timerangeLookback - string representing now minus the timerange configured by the user for checking down monitors
 */
export function getTimestampRange({
  ruleScheduleLookback,
  timerangeLookback,
}: Record<'ruleScheduleLookback' | 'timerangeLookback', string>) {
  const scheduleIntervalAbsoluteTime = datemath.parse(ruleScheduleLookback)?.valueOf();
  const defaultIntervalAbsoluteTime = datemath
    .parse(timerangeLookback)
    ?.subtract('24', 'hours')
    .valueOf();
  const from = min([scheduleIntervalAbsoluteTime, defaultIntervalAbsoluteTime]) ?? 'now-24h';

  return {
    to: 'now',
    from,
  };
}

export const getUniqueIdsByLoc = (
  downMonitorsByLocation: GetMonitorStatusResult[],
  availabilityResults: GetMonitorAvailabilityResult[]
) => {
  const uniqueDownsIdsByLoc = uniqueDownMonitorIds(downMonitorsByLocation);
  const uniqueAvailIdsByLoc = uniqueAvailMonitorIds(availabilityResults);

  return new Set([...uniqueDownsIdsByLoc, ...uniqueAvailIdsByLoc]);
};

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

export const formatFilterString = async (
  uptimeEsClient: UptimeEsClient,
  filters?: StatusCheckFilters,
  search?: string,
  libs?: UMServerLibs
) =>
  await generateFilterDSL(
    () =>
      libs?.requests?.getIndexPattern
        ? libs?.requests?.getIndexPattern({ uptimeEsClient })
        : getUptimeIndexPattern({
            uptimeEsClient,
          }),
    filters,
    search
  );

export const getMonitorSummary = (
  monitorInfo: Ping & { '@timestamp'?: string },
  statusMessage: string
) => {
  const monitorName = monitorInfo.monitor?.name ?? monitorInfo.monitor?.id;
  const observerLocation = monitorInfo.observer?.geo?.name ?? UNNAMED_LOCATION;
  const checkedAt = moment(monitorInfo['@timestamp'] ?? monitorInfo.timestamp).format('LLL');

  const summary = {
    checkedAt,
    monitorUrl: monitorInfo.url?.full,
    monitorId: monitorInfo.monitor?.id,
    monitorName: monitorInfo.monitor?.name ?? monitorInfo.monitor?.id,
    monitorType: monitorInfo.monitor?.type,
    latestErrorMessage: monitorInfo.error?.message,
    observerLocation: monitorInfo.observer?.geo?.name ?? UNNAMED_LOCATION,
    observerHostname: monitorInfo.agent?.name,
  };

  return {
    ...summary,
    [ALERT_REASON_MSG]: getReasonMessage({
      name: monitorName,
      location: observerLocation,
      status: statusMessage,
      timestamp: monitorInfo['@timestamp'] ?? monitorInfo.timestamp,
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

  return i18n.translate('xpack.uptime.alerts.monitorStatus.reasonMessage', {
    defaultMessage: `Monitor "{name}" from {location} {status} Checked at {checkedAt}.`,
    values: {
      name,
      status,
      location,
      checkedAt,
    },
  });
};

export const getMonitorAlertDocument = (monitorSummary: Record<string, string | undefined>) => ({
  'monitor.id': monitorSummary.monitorId,
  'monitor.type': monitorSummary.monitorType,
  'monitor.name': monitorSummary.monitorName,
  'url.full': monitorSummary.monitorUrl,
  'observer.geo.name': monitorSummary.observerLocation,
  'error.message': monitorSummary.latestErrorMessage,
  'agent.name': monitorSummary.observerHostname,
  [ALERT_REASON]: monitorSummary.reason,
});

export const getStatusMessage = (
  downMonParams?: GetMonitorDownStatusMessageParams,
  availMonInfo?: GetMonitorAvailabilityResult,
  availability?: GetMonitorAvailabilityParams
) => {
  let statusMessage = '';
  if (downMonParams?.info) {
    statusMessage = statusCheckTranslations.downMonitorsLabel(
      downMonParams.count!,
      downMonParams.interval!,
      downMonParams.numTimes
    );
  }
  let availabilityMessage = '';

  if (availMonInfo) {
    availabilityMessage = statusCheckTranslations.availabilityBreachLabel(
      (availMonInfo.availabilityRatio! * 100).toFixed(2),
      availability?.threshold!,
      formatDurationFromTimeUnitChar(availability?.range!, availability?.rangeUnit! as TimeUnitChar)
    );
  }
  if (availMonInfo && downMonParams?.info) {
    return statusCheckTranslations.downMonitorsAndAvailabilityBreachLabel(
      statusMessage,
      availabilityMessage
    );
  }
  return statusMessage + availabilityMessage;
};

export const getInstanceId = (monitorInfo: Ping, monIdByLoc: string) => {
  const normalizeText = (txt: string) => {
    // replace url and name special characters with -
    return txt.replace(/[^A-Z0-9]+/gi, '_').toLowerCase();
  };
  const urlText = normalizeText(monitorInfo.url?.full || '');

  const monName = normalizeText(monitorInfo.monitor.name || '');

  if (monName) {
    return `${monName}_${urlText}_${monIdByLoc}`;
  }
  return `${urlText}_${monIdByLoc}`;
};

const getMonIdByLoc = (monitorId: string, location: string) => {
  return monitorId + '-' + location;
};

const uniqueDownMonitorIds = (items: GetMonitorStatusResult[]): Set<string> =>
  items.reduce(
    (acc, { monitorId, location }) => acc.add(getMonIdByLoc(monitorId, location)),
    new Set<string>()
  );

const uniqueAvailMonitorIds = (items: GetMonitorAvailabilityResult[]): Set<string> =>
  items.reduce(
    (acc, { monitorId, location }) => acc.add(getMonIdByLoc(monitorId, location)),
    new Set<string>()
  );

export const statusCheckAlertFactory: UptimeAlertTypeFactory<ActionGroupIds> = (
  server,
  libs,
  plugins
) => ({
  id: CLIENT_ALERT_TYPES.MONITOR_STATUS,
  category: DEFAULT_APP_CATEGORIES.observability.id,
  producer: 'uptime',
  name: i18n.translate('xpack.uptime.alerts.monitorStatus', {
    defaultMessage: 'Uptime monitor status',
  }),
  validate: {
    params: schema.object({
      stackVersion: schema.maybe(schema.string()),
      availability: schema.maybe(
        schema.object({
          range: schema.number(),
          rangeUnit: schema.string(),
          threshold: schema.string(),
        })
      ),
      // deprecated
      filters: schema.maybe(
        schema.oneOf([
          // deprecated
          schema.object({
            'monitor.type': schema.maybe(schema.arrayOf(schema.string())),
            'observer.geo.name': schema.maybe(schema.arrayOf(schema.string())),
            tags: schema.maybe(schema.arrayOf(schema.string())),
            'url.port': schema.maybe(schema.arrayOf(schema.string())),
          }),
          schema.string(),
        ])
      ),
      locations: schema.maybe(schema.arrayOf(schema.string())),
      numTimes: schema.number(),
      search: schema.maybe(schema.string()),
      shouldCheckStatus: schema.boolean(),
      shouldCheckAvailability: schema.boolean(),
      timerangeCount: schema.maybe(schema.number()),
      timerangeUnit: schema.maybe(schema.string()),
      // deprecated
      timerange: schema.maybe(
        schema.object({
          from: schema.string(),
          to: schema.string(),
        })
      ),
      version: schema.maybe(schema.number()),
      isAutoGenerated: schema.maybe(schema.boolean()),
    }),
  },
  defaultActionGroupId: MONITOR_STATUS.id,
  actionGroups: [
    {
      id: MONITOR_STATUS.id,
      name: MONITOR_STATUS.name,
    },
  ],
  actionVariables: {
    context: [
      ACTION_VARIABLES[MESSAGE],
      ACTION_VARIABLES[ALERT_DETAILS_URL],
      ACTION_VARIABLES[ALERT_REASON_MSG],
      ACTION_VARIABLES[VIEW_IN_APP_URL],
      ...commonMonitorStateI18,
    ],
    state: [...commonMonitorStateI18, ...commonStateTranslations],
  },
  isExportable: true,
  minimumLicenseRequired: 'basic',
  doesSetRecoveryContext: true,
  async executor({
    params: rawParams,
    rule: {
      schedule: { interval },
    },
    services: {
      alertFactory,
      alertWithLifecycle,
      getAlertStartedDate,
      getAlertUuid,
      savedObjectsClient,
      scopedClusterClient,
    },
    spaceId,
    state,
    startedAt,
  }) {
    const {
      stackVersion = '8.9.0',
      availability,
      filters,
      isAutoGenerated,
      numTimes,
      search,
      shouldCheckAvailability,
      shouldCheckStatus,
      timerange: oldVersionTimeRange,
      timerangeCount,
      timerangeUnit,
    } = rawParams;
    const { share, basePath } = server;
    const alertsLocator: LocatorPublic<AlertsLocatorParams> | undefined =
      share.url.locators.get(alertsLocatorID);
    const uptimeEsClient = new UptimeEsClient(
      savedObjectsClient,
      scopedClusterClient.asCurrentUser,
      {
        stackVersion,
      }
    );

    const filterString = await formatFilterString(uptimeEsClient, filters, search, libs);
    const timespanInterval = `${String(timerangeCount)}${timerangeUnit}`;
    // Range filter for `monitor.timespan`, the range of time the ping is valid
    const timespanRange = oldVersionTimeRange || {
      from: `now-${timespanInterval}`,
      to: 'now',
    };
    // Range filter for `@timestamp`, the time the document was indexed
    const timestampRange = getTimestampRange({
      ruleScheduleLookback: `now-${interval}`,
      timerangeLookback: timespanRange.from,
    });

    let downMonitorsByLocation: GetMonitorStatusResult[] = [];

    // if oldVersionTimeRange present means it's 7.7 format and
    // after that shouldCheckStatus should be explicitly false
    if (!(!oldVersionTimeRange && shouldCheckStatus === false)) {
      downMonitorsByLocation = await libs.requests.getMonitorStatus({
        uptimeEsClient,
        timespanRange,
        timestampRange,
        numTimes,
        locations: [],
        filters: filterString as JsonObject,
      });
    }

    if (isAutoGenerated) {
      for await (const monitorLoc of downMonitorsByLocation) {
        const monitorInfo = monitorLoc.monitorInfo;
        const monitorStatusMessageParams = getMonitorDownStatusMessageParams(
          monitorInfo,
          monitorLoc.count,
          numTimes,
          timerangeCount,
          timerangeUnit,
          oldVersionTimeRange
        );

        const statusMessage = getStatusMessage(monitorStatusMessageParams);
        const monitorSummary = getMonitorSummary(monitorInfo, statusMessage);
        const alertId = getInstanceId(monitorInfo, monitorLoc.location);
        const alert = alertWithLifecycle({
          id: alertId,
          fields: getMonitorAlertDocument(monitorSummary),
        });
        const indexedStartedAt = getAlertStartedDate(alertId) ?? startedAt.toISOString();
        const alertUuid = getAlertUuid(alertId);

        const relativeViewInAppUrl = getMonitorRouteFromMonitorId({
          monitorId: monitorSummary.monitorId,
          dateRangeEnd: 'now',
          dateRangeStart: indexedStartedAt,
          filters: {
            'observer.geo.name': [monitorSummary.observerLocation],
          },
        });

        const context = {
          ...monitorSummary,
          statusMessage,
        };

        alert.replaceState({
          ...state,
          ...context,
          ...updateState(state, true),
        });

        alert.scheduleActions(MONITOR_STATUS.id, {
          [ALERT_DETAILS_URL]: await getAlertUrl(
            alertUuid,
            spaceId,
            indexedStartedAt,
            alertsLocator,
            basePath.publicBaseUrl
          ),
          [VIEW_IN_APP_URL]: getViewInAppUrl(basePath, spaceId, relativeViewInAppUrl),
          ...context,
        });
      }

      await setRecoveredAlertsContext({
        alertFactory,
        alertsLocator,
        basePath,
        defaultStartedAt: startedAt.toISOString(),
        getAlertStartedDate,
        getAlertUuid,
        spaceId,
      });

      return { state: updateState(state, downMonitorsByLocation.length > 0) };
    }

    let availabilityResults: GetMonitorAvailabilityResult[] = [];
    if (shouldCheckAvailability) {
      availabilityResults = await libs.requests.getMonitorAvailability({
        uptimeEsClient,
        ...availability,
        filters: JSON.stringify(filterString) || undefined,
      });
    }

    const mergedIdsByLoc = getUniqueIdsByLoc(downMonitorsByLocation, availabilityResults);

    await asyncForEach(mergedIdsByLoc, async (monIdByLoc) => {
      const availMonInfo = availabilityResults.find(
        ({ monitorId, location }) => getMonIdByLoc(monitorId, location) === monIdByLoc
      );

      const downMonInfo = downMonitorsByLocation.find(
        ({ monitorId, location }) => getMonIdByLoc(monitorId, location) === monIdByLoc
      )?.monitorInfo;

      const downMonCount = downMonitorsByLocation.find(
        ({ monitorId, location }) => getMonIdByLoc(monitorId, location) === monIdByLoc
      )?.count;

      const monitorInfo = downMonInfo || availMonInfo?.monitorInfo!;

      const monitorStatusMessageParams = getMonitorDownStatusMessageParams(
        downMonInfo!,
        downMonCount!,
        numTimes,
        timerangeCount,
        timerangeUnit,
        oldVersionTimeRange
      );

      const statusMessage = getStatusMessage(
        monitorStatusMessageParams,
        availMonInfo!,
        availability
      );
      const monitorSummary = getMonitorSummary(monitorInfo, statusMessage);
      const alertId = getInstanceId(monitorInfo, monIdByLoc);
      const alert = alertWithLifecycle({
        id: alertId,
        fields: getMonitorAlertDocument(monitorSummary),
      });
      const alertUuid = getAlertUuid(alertId);
      const indexedStartedAt = getAlertStartedDate(alertId) ?? startedAt.toISOString();

      const context = {
        ...monitorSummary,
        statusMessage,
      };

      alert.replaceState({
        ...updateState(state, true),
        ...context,
      });

      const relativeViewInAppUrl = getMonitorRouteFromMonitorId({
        monitorId: monitorSummary.monitorId,
        dateRangeEnd: 'now',
        dateRangeStart: indexedStartedAt,
        filters: {
          'observer.geo.name': [monitorSummary.observerLocation],
        },
      });

      alert.scheduleActions(MONITOR_STATUS.id, {
        [ALERT_DETAILS_URL]: await getAlertUrl(
          alertUuid,
          spaceId,
          indexedStartedAt,
          alertsLocator,
          basePath.publicBaseUrl
        ),
        [VIEW_IN_APP_URL]: getViewInAppUrl(basePath, spaceId, relativeViewInAppUrl),
        ...context,
      });
    });

    await setRecoveredAlertsContext({
      alertFactory,
      alertsLocator,
      basePath,
      defaultStartedAt: startedAt.toISOString(),
      getAlertStartedDate,
      getAlertUuid,
      spaceId,
    });

    return { state: updateState(state, downMonitorsByLocation.length > 0) };
  },
  alerts: UptimeRuleTypeAlertDefinition,
  getViewInAppRelativeUrl: ({ rule }: GetViewInAppRelativeUrlFnOpts<{}>) =>
    observabilityPaths.ruleDetails(rule.id),
});
