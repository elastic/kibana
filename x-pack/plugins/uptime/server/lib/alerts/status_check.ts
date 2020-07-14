/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { schema } from '@kbn/config-schema';
import { isRight } from 'fp-ts/lib/Either';
import { ThrowReporter } from 'io-ts/lib/ThrowReporter';
import { i18n } from '@kbn/i18n';
import { AlertExecutorOptions } from '../../../../alerts/server';
import { UptimeAlertTypeFactory } from './types';
import { GetMonitorStatusResult } from '../requests';
import { esKuery, IIndexPattern } from '../../../../../../src/plugins/data/server';
import { JsonObject } from '../../../../../../src/plugins/kibana_utils/common';
import {
  StatusCheckParamsType,
  StatusCheckParams,
  StatusCheckFilters,
  AtomicStatusCheckParamsType,
  MonitorAvailabilityType,
  DynamicSettings,
} from '../../../common/runtime_types';
import { ACTION_GROUP_DEFINITIONS } from '../../../common/constants';
import { savedObjectsAdapter } from '../saved_objects';
import { updateState } from './common';
import { commonStateTranslations } from './translations';
import { stringifyKueries, combineFiltersAndUserSearch } from '../../../common/lib';
import { GetMonitorAvailabilityResult } from '../requests/get_monitor_availability';
import { UMServerLibs } from '../lib';

const { MONITOR_STATUS } = ACTION_GROUP_DEFINITIONS;

/**
 * Reduce a composite-key array of status results to a set of unique IDs.
 * @param items to reduce
 */
export const uniqueMonitorIds = (items: GetMonitorStatusResult[]): Set<string> =>
  items.reduce((acc, { monitor_id }) => {
    acc.add(monitor_id);
    return acc;
  }, new Set<string>());

const sortAvailabilityResultByRatioAsc = (
  a: GetMonitorAvailabilityResult,
  b: GetMonitorAvailabilityResult
): number => (a.availabilityRatio ?? 100) - (b.availabilityRatio ?? 100);

/**
 * Map an availability result object to a descriptive string.
 */
const mapAvailabilityResultToString = ({
  availabilityRatio,
  name,
  monitorId,
  url,
}: GetMonitorAvailabilityResult) =>
  i18n.translate('xpack.uptime.alerts.availability.monitorSummary', {
    defaultMessage: '{nameOrId}({url}): {availabilityRatio}%',
    values: {
      nameOrId: name || monitorId,
      url,
      availabilityRatio: ((availabilityRatio ?? 1.0) * 100).toPrecision(5),
    },
  });

const reduceAvailabilityStringsToMessage = (threshold: string) => (
  prev: string,
  cur: string,
  _ind: number,
  array: string[]
) => {
  let prefix: string = '';
  if (prev !== '') {
    prefix = prev;
  } else if (array.length > 1) {
    prefix = i18n.translate('xpack.uptime.alerts.availability.multiItemTitle', {
      defaultMessage: `Top {monitorCount} Monitors Below Availability Threshold ({threshold} %):\n`,
      values: {
        monitorCount: Math.min(array.length, MESSAGE_AVAILABILITY_MAX),
        threshold,
      },
    });
  } else {
    prefix = i18n.translate('xpack.uptime.alerts.availability.singleItemTitle', {
      defaultMessage: `Monitor Below Availability Threshold ({threshold} %):\n`,
      values: { threshold },
    });
  }
  return prefix + `${cur}\n`;
};

const MESSAGE_AVAILABILITY_MAX = 3;

/**
 * Creates a summary message from a list of availability check result objects.
 * @param availabilityResult the list of results
 * @param threshold the threshold used by the check
 */
export const availabilityMessage = (
  availabilityResult: GetMonitorAvailabilityResult[],
  threshold: string,
  max: number = MESSAGE_AVAILABILITY_MAX
): string => {
  return availabilityResult.length > 0
    ? // if there are results, map each item to a descriptive string, and reduce the list
      availabilityResult
        .sort(sortAvailabilityResultByRatioAsc)
        .slice(0, max)
        .map(mapAvailabilityResultToString)
        .reduce(reduceAvailabilityStringsToMessage(threshold), '')
    : // if there are no results, return an empty list default string
      i18n.translate('xpack.uptime.alerts.availability.emptyMessage', {
        defaultMessage: `No monitors were below Availability Threshold ({threshold} %)`,
        values: {
          threshold,
        },
      });
};

/**
 * Generates a message to include in contexts of alerts.
 * @param monitors the list of monitors to include in the message
 * @param max the maximum number of items the summary should contain
 */
export const contextMessage = (
  monitorIds: string[],
  max: number,
  availabilityResult: GetMonitorAvailabilityResult[],
  availabilityThreshold: string,
  availabilityWasChecked: boolean,
  statusWasChecked: boolean
): string => {
  const MIN = 2;
  if (max < MIN) throw new Error(`Maximum value must be greater than ${MIN}, received ${max}.`);

  // generate the message
  let message = '';
  if (statusWasChecked) {
    if (monitorIds.length === 1) {
      message = i18n.translate('xpack.uptime.alerts.message.singularTitle', {
        defaultMessage: 'Down monitor: ',
      });
    } else if (monitorIds.length) {
      message = i18n.translate('xpack.uptime.alerts.message.multipleTitle', {
        defaultMessage: 'Down monitors: ',
      });
    } else {
      message = i18n.translate('xpack.uptime.alerts.message.emptyTitle', {
        defaultMessage: 'No down monitor IDs received',
      });
    }

    for (let i = 0; i < monitorIds.length; i++) {
      const id = monitorIds[i];
      if (i === max) {
        message =
          message +
          i18n.translate('xpack.uptime.alerts.message.overflowBody', {
            defaultMessage: `... and {overflowCount} other monitors`,
            values: {
              overflowCount: monitorIds.length - i,
            },
          });
        break;
      } else if (i === 0) {
        message = message + id;
      } else {
        message = message + `, ${id}`;
      }
    }
  }

  if (availabilityWasChecked) {
    const availabilityMsg = availabilityMessage(availabilityResult, availabilityThreshold);
    return message ? message + '\n' + availabilityMsg : availabilityMsg;
  }

  return message;
};

/**
 * Creates an exhaustive list of all the down monitors.
 * @param list all the monitors that are down
 * @param sizeLimit the max monitors, we shouldn't allow an arbitrarily long string
 */
export const fullListByIdAndLocation = (
  list: GetMonitorStatusResult[],
  sizeLimit: number = 1000
) => {
  return (
    list
      // sort by id, then location
      .sort((a, b) => {
        if (a.monitor_id > b.monitor_id) {
          return 1;
        } else if (a.monitor_id < b.monitor_id) {
          return -1;
        } else if (a.location > b.location) {
          return 1;
        }
        return -1;
      })
      .slice(0, sizeLimit)
      .reduce(
        (cur, { monitor_id: id, location }) =>
          cur + `${id} from ${location ?? 'Unnamed location'}; `,
        ''
      ) +
    (sizeLimit < list.length
      ? i18n.translate('xpack.uptime.alerts.message.fullListOverflow', {
          defaultMessage: '...and {overflowCount} other {pluralizedMonitor}',
          values: {
            pluralizedMonitor:
              list.length - sizeLimit === 1 ? 'monitor/location' : 'monitors/locations',
            overflowCount: list.length - sizeLimit,
          },
        })
      : '')
  );
};

// Right now the maximum number of monitors shown in the message is hardcoded here.
// we might want to make this a parameter in the future
const DEFAULT_MAX_MESSAGE_ROWS = 3;

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
  filters?: StatusCheckFilters,
  search?: string
): Promise<JsonObject | undefined> => {
  const filtersExist = hasFilters(filters);
  if (!filtersExist && !search) return undefined;

  let filterString: string | undefined;
  if (filtersExist) {
    filterString = stringifyKueries(new Map(Object.entries(filters ?? {})));
  }

  let combinedString: string | undefined;
  if (filterString && search) {
    combinedString = combineFiltersAndUserSearch(filterString, search);
  } else if (filterString) {
    combinedString = filterString;
  } else if (search) {
    combinedString = search;
  }

  return esKuery.toElasticsearchQuery(
    esKuery.fromKueryExpression(combinedString ?? ''),
    await getIndexPattern()
  );
};

const formatFilterString = async (
  libs: UMServerLibs,
  dynamicSettings: DynamicSettings,
  options: AlertExecutorOptions,
  filters?: StatusCheckFilters,
  search?: string
) =>
  JSON.stringify(
    await generateFilterDSL(
      () =>
        libs.requests.getIndexPattern({
          callES: options.services.callCluster,
          dynamicSettings,
        }),
      filters,
      search
    )
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
    state: [...commonStateTranslations],
  },
  producer: 'uptime',
  async executor(options: AlertExecutorOptions) {
    const { params: rawParams } = options;
    const dynamicSettings = await savedObjectsAdapter.getUptimeDynamicSettings(
      options.services.savedObjectsClient
    );
    const atomicDecoded = AtomicStatusCheckParamsType.decode(rawParams);
    const availabilityDecoded = MonitorAvailabilityType.decode(rawParams);
    const decoded = StatusCheckParamsType.decode(rawParams);
    let filterString: string = '';
    let params: StatusCheckParams;
    if (isRight(atomicDecoded)) {
      const { filters, search, numTimes, timerangeCount, timerangeUnit } = atomicDecoded.right;
      const timerange = { from: `now-${String(timerangeCount) + timerangeUnit}`, to: 'now' };
      filterString = await formatFilterString(libs, dynamicSettings, options, filters, search);
      params = {
        timerange,
        numTimes,
        locations: [],
        filters: filterString,
      };
    } else if (isRight(decoded)) {
      params = decoded.right;
    } else if (!isRight(availabilityDecoded)) {
      ThrowReporter.report(decoded);
      return {
        error: 'Alert param types do not conform to required shape.',
      };
    }

    let availabilityResults: GetMonitorAvailabilityResult[] = [];
    if (
      isRight(availabilityDecoded) &&
      availabilityDecoded.right.shouldCheckAvailability === true
    ) {
      const { filters, search } = availabilityDecoded.right;
      if (filterString === '' && (filters || search)) {
        filterString = await formatFilterString(libs, dynamicSettings, options, filters, search);
      }

      availabilityResults = await libs.requests.getMonitorAvailability({
        callES: options.services.callCluster,
        dynamicSettings,
        ...availabilityDecoded.right.availability,
        filters: filterString || undefined,
      });
    }

    /* This is called `monitorsByLocation` but it's really
     * monitors by location by status. The query we run to generate this
     * filters on the status field, so effectively there should be one and only one
     * status represented in the result set. */
    let monitorsByLocation: GetMonitorStatusResult[] = [];

    // old alert versions are missing this field so it must default to true
    const verifiedParams = StatusCheckParamsType.decode(params!);
    if (isRight(verifiedParams) && (verifiedParams.right?.shouldCheckStatus ?? true)) {
      monitorsByLocation = await libs.requests.getMonitorStatus({
        callES: options.services.callCluster,
        dynamicSettings,
        ...verifiedParams.right,
      });
    }

    // if no monitors are down for our query, we don't need to trigger an alert
    if (monitorsByLocation.length || availabilityResults.length) {
      const uniqueIds = uniqueMonitorIds(monitorsByLocation);
      const alertInstance = options.services.alertInstanceFactory(MONITOR_STATUS.id);
      alertInstance.replaceState({
        ...options.state,
        monitors: monitorsByLocation,
        ...updateState(options.state, true),
      });
      alertInstance.scheduleActions(MONITOR_STATUS.id, {
        message: contextMessage(
          Array.from(uniqueIds.keys()),
          DEFAULT_MAX_MESSAGE_ROWS,
          availabilityResults,
          isRight(availabilityDecoded) ? availabilityDecoded.right.availability.threshold : '100',
          isRight(availabilityDecoded) && availabilityDecoded.right.shouldCheckAvailability,
          rawParams?.shouldCheckStatus ?? false
        ),
        downMonitorsWithGeo: fullListByIdAndLocation(monitorsByLocation),
      });
    }

    return updateState(options.state, monitorsByLocation.length > 0);
  },
});
