/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { schema } from '@kbn/config-schema';
import { i18n } from '@kbn/i18n';
import { ILegacyScopedClusterClient } from 'kibana/server';
import { UptimeAlertTypeFactory } from './types';
import { esKuery, IIndexPattern } from '../../../../../../src/plugins/data/server';
import { JsonObject } from '../../../../../../src/plugins/kibana_utils/common';
import {
  StatusCheckParams,
  StatusCheckFilters,
  DynamicSettings,
} from '../../../common/runtime_types';
import { ACTION_GROUP_DEFINITIONS } from '../../../common/constants/alerts';
import { updateState } from './common';
import { commonMonitorStateI18, commonStateTranslations } from './translations';
import { stringifyKueries, combineFiltersAndUserSearch } from '../../../common/lib';
import { GetMonitorAvailabilityResult } from '../requests/get_monitor_availability';
import { UMServerLibs } from '../lib';
import { GetMonitorStatusResult } from '../requests/get_monitor_status';

const { MONITOR_STATUS } = ACTION_GROUP_DEFINITIONS;

/**
 * Reduce a composite-key array of status results to a set of unique IDs.
 * @param items to reduce
 */
export const uniqueMonitorIds = (items: GetMonitorStatusResult[]): Set<string> =>
  items.reduce((acc, { monitor_id }) => acc.add(monitor_id), new Set<string>());

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
  getIndexPattern: () => Promise<IIndexPattern | undefined>,
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

const formatFilterString = async (
  libs: UMServerLibs,
  dynamicSettings: DynamicSettings,
  callES: ILegacyScopedClusterClient['callAsCurrentUser'],
  filters: StatusCheckFilters,
  search: string
) =>
  await generateFilterDSL(
    () =>
      libs.requests.getIndexPattern({
        callES,
        dynamicSettings,
      }),
    filters,
    search
  );

export const statusCheckAlertFactory: UptimeAlertTypeFactory = (_server, libs) => ({
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
      shouldCheckStatus: schema.maybe(schema.boolean()),
      shouldCheckAvailability: schema.maybe(schema.boolean()),
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
  async executor(
    { params: rawParams, state, services: { alertInstanceFactory } },
    callES,
    dynamicSettings
  ) {
    const {
      filters,
      search,
      numTimes,
      timerangeCount,
      timerangeUnit,
      shouldCheckAvailability,
      shouldCheckStatus,
    } = rawParams;

    const timerange = { from: `now-${String(timerangeCount) + timerangeUnit}`, to: 'now' };

    const filterString = await formatFilterString(libs, dynamicSettings, callES, filters, search);

    const params: StatusCheckParams = {
      timerange,
      numTimes,
      locations: [],
      filters: filterString,
    };

    let availabilityResults: GetMonitorAvailabilityResult[] = [];
    if (shouldCheckAvailability) {
      const { availability } = rawParams;

      availabilityResults = await libs.requests.getMonitorAvailability({
        callES,
        dynamicSettings,
        ...availability,
        filters: filterString || undefined,
      });
    }

    let downMonitorsByLocation: GetMonitorStatusResult[] = [];

    if (shouldCheckStatus) {
      downMonitorsByLocation = await libs.requests.getMonitorStatus({
        callES,
        dynamicSettings,
        ...params,
      });
    }

    // if no monitors are down for our query, we don't need to trigger an alert
    if (downMonitorsByLocation.length || availabilityResults.length) {
      const uniqueIds = uniqueMonitorIds(downMonitorsByLocation);

      uniqueIds.forEach((monId) => {
        const alertInstance = alertInstanceFactory(MONITOR_STATUS.id + monId);

        alertInstance.replaceState({
          ...state,
          monitors: downMonitorsByLocation,
          ...updateState(state, true),
        });

        alertInstance.scheduleActions(MONITOR_STATUS.id);
      });
    }

    return updateState(state, downMonitorsByLocation.length > 0);
  },
});
