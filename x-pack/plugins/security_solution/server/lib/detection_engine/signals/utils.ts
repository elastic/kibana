/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { createHash } from 'crypto';
import moment from 'moment';
import dateMath from '@elastic/datemath';

import { SavedObjectsClientContract } from '../../../../../../../src/core/server';
import { AlertServices, parseDuration } from '../../../../../alerts/server';
import { ExceptionListClient, ListClient, ListPluginSetup } from '../../../../../lists/server';
import { EntriesArray, ExceptionListItemSchema } from '../../../../../lists/common/schemas';
import { ListArrayOrUndefined } from '../../../../common/detection_engine/schemas/types/lists';
import { hasListsFeature } from '../feature_flags';
import { BulkResponse, BulkResponseErrorAggregation } from './types';

interface SortExceptionsReturn {
  exceptionsWithValueLists: ExceptionListItemSchema[];
  exceptionsWithoutValueLists: ExceptionListItemSchema[];
}

export const getListsClient = async ({
  lists,
  spaceId,
  updatedByUser,
  services,
  savedObjectClient,
}: {
  lists: ListPluginSetup | undefined;
  spaceId: string;
  updatedByUser: string | null;
  services: AlertServices;
  savedObjectClient: SavedObjectsClientContract;
}): Promise<{
  listClient: ListClient | undefined;
  exceptionsClient: ExceptionListClient | undefined;
}> => {
  // TODO Remove check once feature is no longer behind flag
  if (hasListsFeature()) {
    if (lists == null) {
      throw new Error('lists plugin unavailable during rule execution');
    }

    const listClient = await lists.getListClient(
      services.callCluster,
      spaceId,
      updatedByUser ?? 'elastic'
    );
    const exceptionsClient = await lists.getExceptionListClient(
      savedObjectClient,
      updatedByUser ?? 'elastic'
    );

    return { listClient, exceptionsClient };
  } else {
    return { listClient: undefined, exceptionsClient: undefined };
  }
};

export const hasLargeValueList = (entries: EntriesArray): boolean => {
  const found = entries.filter(({ type }) => type === 'list');
  return found.length > 0;
};

export const getExceptions = async ({
  client,
  lists,
}: {
  client: ExceptionListClient | undefined;
  lists: ListArrayOrUndefined;
}): Promise<ExceptionListItemSchema[] | undefined> => {
  // TODO Remove check once feature is no longer behind flag
  if (hasListsFeature()) {
    if (client == null) {
      throw new Error('lists plugin unavailable during rule execution');
    }

    if (lists != null) {
      try {
        // Gather all exception items of all exception lists linked to rule
        const exceptions = await Promise.all(
          lists
            .map(async (list) => {
              const { id, namespace_type: namespaceType } = list;
              const items = await client.findExceptionListItem({
                listId: id,
                namespaceType,
                page: 1,
                perPage: 5000,
                filter: undefined,
                sortOrder: undefined,
                sortField: undefined,
              });
              return items != null ? items.data : [];
            })
            .flat()
        );
        return exceptions.flat();
      } catch {
        return [];
      }
    }
  }
};

export const sortExceptionItems = (exceptions: ExceptionListItemSchema[]): SortExceptionsReturn => {
  return exceptions.reduce<SortExceptionsReturn>(
    (acc, exception) => {
      const { entries } = exception;
      const { exceptionsWithValueLists, exceptionsWithoutValueLists } = acc;

      if (hasLargeValueList(entries)) {
        return {
          exceptionsWithValueLists: [...exceptionsWithValueLists, { ...exception }],
          exceptionsWithoutValueLists,
        };
      } else {
        return {
          exceptionsWithValueLists,
          exceptionsWithoutValueLists: [...exceptionsWithoutValueLists, { ...exception }],
        };
      }
    },
    { exceptionsWithValueLists: [], exceptionsWithoutValueLists: [] }
  );
};

export const generateId = (
  docIndex: string,
  docId: string,
  version: string,
  ruleId: string
): string => createHash('sha256').update(docIndex.concat(docId, version, ruleId)).digest('hex');

export const parseInterval = (intervalString: string): moment.Duration | null => {
  try {
    return moment.duration(parseDuration(intervalString));
  } catch (err) {
    return null;
  }
};

export const parseScheduleDates = (time: string): moment.Moment | null => {
  const isValidDateString = !isNaN(Date.parse(time));
  const isValidInput = isValidDateString || time.trim().startsWith('now');
  const formattedDate = isValidDateString
    ? moment(time)
    : isValidInput
    ? dateMath.parse(time)
    : null;

  return formattedDate ?? null;
};

export const getDriftTolerance = ({
  from,
  to,
  interval,
  now = moment(),
}: {
  from: string;
  to: string;
  interval: moment.Duration;
  now?: moment.Moment;
}): moment.Duration | null => {
  const toDate = parseScheduleDates(to) ?? now;
  const fromDate = parseScheduleDates(from) ?? dateMath.parse('now-6m');
  const timeSegment = toDate.diff(fromDate);
  const duration = moment.duration(timeSegment);

  if (duration !== null) {
    return duration.subtract(interval);
  } else {
    return null;
  }
};

export const getGapBetweenRuns = ({
  previousStartedAt,
  interval,
  from,
  to,
  now = moment(),
}: {
  previousStartedAt: Date | undefined | null;
  interval: string;
  from: string;
  to: string;
  now?: moment.Moment;
}): moment.Duration | null => {
  if (previousStartedAt == null) {
    return null;
  }
  const intervalDuration = parseInterval(interval);
  if (intervalDuration == null) {
    return null;
  }
  const driftTolerance = getDriftTolerance({ from, to, interval: intervalDuration });
  if (driftTolerance == null) {
    return null;
  }
  const diff = moment.duration(now.diff(previousStartedAt));
  const drift = diff.subtract(intervalDuration);
  return drift.subtract(driftTolerance);
};

export const makeFloatString = (num: number): string => Number(num).toFixed(2);

/**
 * Given a BulkResponse this will return an aggregation based on the errors if any exist
 * from the BulkResponse. Errors are aggregated on the reason as the unique key.
 *
 * Example would be:
 * {
 *   'Parse Error': {
 *      count: 100,
 *      statusCode: 400,
 *   },
 *   'Internal server error': {
 *       count: 3,
 *       statusCode: 500,
 *   }
 * }
 * If this does not return any errors then you will get an empty object like so: {}
 * @param response The bulk response to aggregate based on the error message
 * @param ignoreStatusCodes Optional array of status codes to ignore when creating aggregate error messages
 * @returns The aggregated example as shown above.
 */
export const errorAggregator = (
  response: BulkResponse,
  ignoreStatusCodes: number[]
): BulkResponseErrorAggregation => {
  return response.items.reduce<BulkResponseErrorAggregation>((accum, item) => {
    if (item.create.error != null && !ignoreStatusCodes.includes(item.create.status)) {
      if (accum[item.create.error.reason] == null) {
        accum[item.create.error.reason] = {
          count: 1,
          statusCode: item.create.status,
        };
      } else {
        accum[item.create.error.reason] = {
          count: accum[item.create.error.reason].count + 1,
          statusCode: item.create.status,
        };
      }
    }
    return accum;
  }, Object.create(null));
};
