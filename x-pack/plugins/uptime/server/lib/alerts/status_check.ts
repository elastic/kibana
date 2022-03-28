/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { min } from 'lodash';

import datemath from '@elastic/datemath';
import { schema } from '@kbn/config-schema';
import { i18n } from '@kbn/i18n';
import { JsonObject } from '@kbn/utility-types';
import { fromKueryExpression, toElasticsearchQuery } from '@kbn/es-query';
import { ALERT_REASON } from '@kbn/rule-data-utils';
import { UptimeAlertTypeFactory } from './types';
import {
  StatusCheckFilters,
  Ping,
  GetMonitorAvailabilityParams,
} from '../../../common/runtime_types';
import { MONITOR_STATUS } from '../../../common/constants/alerts';
import { updateState, getViewInAppUrl } from './common';
import {
  commonMonitorStateI18,
  commonStateTranslations,
  statusCheckTranslations,
} from './translations';
import { stringifyKueries, combineFiltersAndUserSearch } from '../../../common/lib';
import { GetMonitorAvailabilityResult } from '../requests/get_monitor_availability';
import {
  GetMonitorStatusResult,
  GetMonitorDownStatusMessageParams,
  getMonitorDownStatusMessageParams,
} from '../requests/get_monitor_status';
import { UNNAMED_LOCATION } from '../../../common/constants';
import { getUptimeIndexPattern, IndexPatternTitleAndFields } from '../requests/get_index_pattern';
import { UMServerLibs, UptimeESClient, createUptimeESClient } from '../lib';
import { ActionGroupIdsOf } from '../../../../alerting/common';
import { formatDurationFromTimeUnitChar, TimeUnitChar } from '../../../../observability/common';
import {
  ALERT_REASON_MSG,
  MESSAGE,
  MONITOR_WITH_GEO,
  ACTION_VARIABLES,
  VIEW_IN_APP_URL,
} from './action_variables';
import { getMonitorRouteFromMonitorId } from '../../../common/utils/get_monitor_url';

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
  filters: StatusCheckFilters,
  search: string
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
  uptimeEsClient: UptimeESClient,
  filters: StatusCheckFilters,
  search: string,
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

export const getMonitorSummary = (monitorInfo: Ping, statusMessage: string) => {
  const monitorName = monitorInfo.monitor?.name ?? monitorInfo.monitor?.id;
  const observerLocation = monitorInfo.observer?.geo?.name ?? UNNAMED_LOCATION;
  const summary = {
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
    [ALERT_REASON_MSG]: `${monitorName} from ${observerLocation} ${statusMessage}`,
  };
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

export const statusCheckAlertFactory: UptimeAlertTypeFactory<ActionGroupIds> = (server, libs) => ({
  id: 'xpack.uptime.alerts.monitorStatus',
  producer: 'uptime',
  name: i18n.translate('xpack.uptime.alerts.monitorStatus', {
    defaultMessage: 'Uptime monitor status',
  }),
  validate: {
    params: schema.object({
      availability: schema.maybe(
        schema.object({
          range: schema.number(),
          rangeUnit: schema.string(),
          threshold: schema.string(),
        })
      ),
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
      // deprecated
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
      ACTION_VARIABLES[MONITOR_WITH_GEO],
      ACTION_VARIABLES[ALERT_REASON_MSG],
      ACTION_VARIABLES[VIEW_IN_APP_URL],
      ...commonMonitorStateI18,
      ...commonStateTranslations,
    ],
    state: [...commonMonitorStateI18, ...commonStateTranslations],
  },
  isExportable: true,
  minimumLicenseRequired: 'basic',
  async executor({
    params: rawParams,
    state,
    services: {
      savedObjectsClient,
      scopedClusterClient,
      alertWithLifecycle,
      getAlertStartedDate,
      alertFactory,
    },
    rule: {
      schedule: { interval },
    },
    startedAt,
  }) {
    const {
      filters,
      search,
      numTimes,
      timerangeCount,
      timerangeUnit,
      availability,
      shouldCheckAvailability,
      shouldCheckStatus,
      isAutoGenerated,
      timerange: oldVersionTimeRange,
    } = rawParams;
    const { basePath } = server;
    const uptimeEsClient = createUptimeESClient({
      esClient: scopedClusterClient.asCurrentUser,
      savedObjectsClient,
    });

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
      for (const monitorLoc of downMonitorsByLocation) {
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
        const indexedStartedAt = getAlertStartedDate(alertId) ?? startedAt.toISOString();
        const alert = alertWithLifecycle({
          id: alertId,
          fields: getMonitorAlertDocument(monitorSummary),
        });

        alert.replaceState({
          ...state,
          ...monitorSummary,
          statusMessage,
          ...updateState(state, true),
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
          [VIEW_IN_APP_URL]: getViewInAppUrl(relativeViewInAppUrl, basePath),
          ...monitorSummary,
        });
      }
      return updateState(state, downMonitorsByLocation.length > 0);
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

    mergedIdsByLoc.forEach((monIdByLoc) => {
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
      const indexedStartedAt = getAlertStartedDate(alertId) ?? startedAt.toISOString();
      const alert = alertWithLifecycle({
        id: alertId,
        fields: getMonitorAlertDocument(monitorSummary),
      });

      alert.replaceState({
        ...updateState(state, true),
        ...monitorSummary,
        statusMessage,
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
        [VIEW_IN_APP_URL]: getViewInAppUrl(relativeViewInAppUrl, basePath),
        ...monitorSummary,
      });
    });
    return updateState(state, downMonitorsByLocation.length > 0);
  },
});
