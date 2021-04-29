/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { i18n } from '@kbn/i18n';
import Mustache from 'mustache';
import { ActionGroupIdsOf } from '../../../../alerting/common';
import { UptimeAlertTypeFactory } from './types';
import { esKuery } from '../../../../../../src/plugins/data/server';
import { JsonObject } from '../../../../../../src/plugins/kibana_utils/common';
import {
  StatusCheckFilters,
  Ping,
  GetMonitorAvailabilityParams,
} from '../../../common/runtime_types';
import { MONITOR_STATUS } from '../../../common/constants/alerts';
import { updateState } from './common';
import { commonMonitorStateI18, commonStateTranslations, DOWN_LABEL } from './translations';
import { stringifyKueries, combineFiltersAndUserSearch } from '../../../common/lib';
import { GetMonitorAvailabilityResult } from '../requests/get_monitor_availability';
import { GetMonitorStatusResult } from '../requests/get_monitor_status';
import { UNNAMED_LOCATION } from '../../../common/constants';
import { uptimeAlertWrapper } from './uptime_alert_wrapper';
import { MonitorStatusTranslations } from '../../../common/translations';
import { getUptimeIndexPattern, IndexPatternTitleAndFields } from '../requests/get_index_pattern';
import { UMServerLibs, UptimeESClient } from '../lib';

export type ActionGroupIds = ActionGroupIdsOf<typeof MONITOR_STATUS>;

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
): Promise<JsonObject | undefined> => {
  const filtersExist = hasFilters(filters);
  if (!filtersExist && !search) return undefined;

  let filterString = '';
  if (filtersExist) {
    filterString = stringifyKueries(new Map(Object.entries(filters ?? {})));
  }

  const combinedString = combineFiltersAndUserSearch(filterString, search);

  return esKuery.toElasticsearchQuery(
    esKuery.fromKueryExpression(combinedString ?? ''),
    await getIndexPattern()
  );
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

export const getMonitorSummary = (monitorInfo: Ping) => {
  return {
    monitorUrl: monitorInfo.url?.full,
    monitorId: monitorInfo.monitor?.id,
    monitorName: monitorInfo.monitor?.name ?? monitorInfo.monitor?.id,
    monitorType: monitorInfo.monitor?.type,
    latestErrorMessage: monitorInfo.error?.message,
    observerLocation: monitorInfo.observer?.geo?.name ?? UNNAMED_LOCATION,
    observerHostname: monitorInfo.agent?.name,
  };
};

const generateMessageForOlderVersions = (fields: Record<string, any>) => {
  const messageTemplate = MonitorStatusTranslations.defaultActionMessage;

  // Monitor {{state.monitorName}} with url {{{state.monitorUrl}}} is {{state.statusMessage}} from
  // {{state.observerLocation}}. The latest error message is {{{state.latestErrorMessage}}}

  return Mustache.render(messageTemplate, { state: { ...fields } });
};

export const getStatusMessage = (
  downMonInfo?: Ping,
  availMonInfo?: GetMonitorAvailabilityResult,
  availability?: GetMonitorAvailabilityParams
) => {
  let statusMessage = '';
  if (downMonInfo) {
    statusMessage = DOWN_LABEL;
  }
  let availabilityMessage = '';

  if (availMonInfo) {
    availabilityMessage = i18n.translate(
      'xpack.uptime.alerts.monitorStatus.actionVariables.availabilityMessage',
      {
        defaultMessage:
          'below threshold with {availabilityRatio}% availability expected is {expectedAvailability}%',
        values: {
          availabilityRatio: (availMonInfo.availabilityRatio! * 100).toFixed(2),
          expectedAvailability: availability?.threshold,
        },
      }
    );
  }
  if (availMonInfo && downMonInfo) {
    return i18n.translate(
      'xpack.uptime.alerts.monitorStatus.actionVariables.downAndAvailabilityMessage',
      {
        defaultMessage: '{statusMessage} and also {availabilityMessage}',
        values: {
          statusMessage,
          availabilityMessage,
        },
      }
    );
  }
  return statusMessage + availabilityMessage;
};

const getInstanceId = (monitorInfo: Ping, monIdByLoc: string) => {
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

export const statusCheckAlertFactory: UptimeAlertTypeFactory<ActionGroupIds> = (_server, libs) =>
  uptimeAlertWrapper<ActionGroupIds>({
    id: 'xpack.uptime.alerts.monitorStatus',
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
        {
          name: 'message',
          description: i18n.translate(
            'xpack.uptime.alerts.monitorStatus.actionVariables.context.message.description',
            {
              defaultMessage: 'A generated message summarizing the currently down monitors',
            }
          ),
        },
        {
          name: 'downMonitorsWithGeo',
          description: i18n.translate(
            'xpack.uptime.alerts.monitorStatus.actionVariables.context.downMonitorsWithGeo.description',
            {
              defaultMessage:
                'A generated summary that shows some or all of the monitors detected as "down" by the alert',
            }
          ),
        },
      ],
      state: [...commonMonitorStateI18, ...commonStateTranslations],
    },
    minimumLicenseRequired: 'basic',
    async executor({
      options: {
        params: rawParams,
        state,
        services: { alertInstanceFactory },
      },
      uptimeEsClient,
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

      const filterString = await formatFilterString(uptimeEsClient, filters, search, libs);

      const timerange = oldVersionTimeRange || {
        from: `now-${String(timerangeCount) + timerangeUnit}`,
        to: 'now',
      };

      let downMonitorsByLocation: GetMonitorStatusResult[] = [];

      // if oldVersionTimeRange present means it's 7.7 format and
      // after that shouldCheckStatus should be explicitly false
      if (!(!oldVersionTimeRange && shouldCheckStatus === false)) {
        downMonitorsByLocation = await libs.requests.getMonitorStatus({
          uptimeEsClient,
          timerange,
          numTimes,
          locations: [],
          filters: filterString,
        });
      }

      if (isAutoGenerated) {
        for (const monitorLoc of downMonitorsByLocation) {
          const monitorInfo = monitorLoc.monitorInfo;

          const alertInstance = alertInstanceFactory(
            getInstanceId(monitorInfo, monitorLoc.location)
          );

          const monitorSummary = getMonitorSummary(monitorInfo);
          const statusMessage = getStatusMessage(monitorInfo);

          alertInstance.replaceState({
            ...state,
            ...monitorSummary,
            statusMessage,
            ...updateState(state, true),
          });

          alertInstance.scheduleActions(MONITOR_STATUS.id);
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

        const monitorInfo = downMonInfo || availMonInfo?.monitorInfo!;

        const monitorSummary = getMonitorSummary(monitorInfo);
        const statusMessage = getStatusMessage(downMonInfo!, availMonInfo!, availability);

        const alertInstance = alertInstanceFactory(getInstanceId(monitorInfo, monIdByLoc));

        alertInstance.replaceState({
          ...updateState(state, true),
          ...monitorSummary,
          statusMessage,
        });

        alertInstance.scheduleActions(MONITOR_STATUS.id, {
          message: generateMessageForOlderVersions({ ...monitorSummary, statusMessage }),
        });
      });

      return updateState(state, downMonitorsByLocation.length > 0);
    },
  });
