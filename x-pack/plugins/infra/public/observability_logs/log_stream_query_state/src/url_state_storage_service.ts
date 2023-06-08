/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IToasts } from '@kbn/core-notifications-browser';
import { Query } from '@kbn/es-query';
import { IKbnUrlStateStorage, withNotifyOnErrors } from '@kbn/kibana-utils-plugin/public';
import * as Array from 'fp-ts/lib/Array';
import * as Either from 'fp-ts/lib/Either';
import { identity, pipe } from 'fp-ts/lib/function';
import * as rt from 'io-ts';
import { InvokeCreator } from 'xstate';
import { DurationInputObject } from 'moment';
import moment from 'moment';
import { minimalTimeKeyRT, TimeRange } from '../../../../common/time';
import { datemathStringRT } from '../../../utils/datemath';
import { createPlainError, formatErrors } from '../../../../common/runtime_types';
import { replaceStateKeyInQueryString } from '../../../utils/url_state';
import type { LogStreamQueryContext, LogStreamQueryEvent, ParsedQuery } from './types';
import {
  DEFAULT_FILTERS,
  DEFAULT_QUERY,
  DEFAULT_REFRESH_INTERVAL,
  DEFAULT_TIMERANGE,
} from './defaults';

interface LogStreamQueryUrlStateDependencies {
  filterStateKey?: string;
  positionStateKey?: string;
  savedQueryIdKey?: string;
  toastsService: IToasts;
  urlStateStorage: IKbnUrlStateStorage;
}

const defaultFilterStateKey = 'logFilter';
const defaultPositionStateKey = 'logPosition'; // NOTE: Provides backwards compatibility for start / end / streamLive previously stored under the logPosition key.

type RequiredDefaults = Required<Omit<FilterStateInUrl, 'timeRange' | 'refreshInterval'>>;
type OptionalDefaults = Pick<FilterStateInUrl, 'timeRange' | 'refreshInterval'>;
type FullDefaults = Required<RequiredDefaults & OptionalDefaults>;

const requiredDefaultFilterStateValue: RequiredDefaults = {
  query: DEFAULT_QUERY,
  filters: DEFAULT_FILTERS,
};

const optionalDefaultFilterStateValue = {
  timeRange: DEFAULT_TIMERANGE,
  refreshInterval: DEFAULT_REFRESH_INTERVAL,
};

const defaultFilterStateValue: FullDefaults = {
  ...requiredDefaultFilterStateValue,
  ...optionalDefaultFilterStateValue,
};

export const safeDefaultParsedQuery: ParsedQuery = {
  bool: {
    must: [],
    must_not: [],
    should: [],
    filter: [{ match_none: {} }],
  },
};

export const updateContextInUrl =
  ({
    urlStateStorage,
    filterStateKey = defaultFilterStateKey,
  }: LogStreamQueryUrlStateDependencies) =>
  (context: LogStreamQueryContext, _event: LogStreamQueryEvent) => {
    if (
      !('query' in context) ||
      !('filters' in context) ||
      !('timeRange' in context) ||
      !('refreshInterval' in context)
    ) {
      throw new Error('Missing keys from context needed to sync to the URL');
    }

    urlStateStorage.set(
      filterStateKey,
      filterStateInUrlRT.encode({
        query: context.query,
        filters: context.filters,
        timeRange: context.timeRange,
        refreshInterval: context.refreshInterval,
      }),
      { replace: true }
    );
  };

export const initializeFromUrl =
  ({
    filterStateKey = defaultFilterStateKey,
    positionStateKey = defaultPositionStateKey,
    toastsService,
    urlStateStorage,
  }: LogStreamQueryUrlStateDependencies): InvokeCreator<
    LogStreamQueryContext,
    LogStreamQueryEvent
  > =>
  (_context, _event) =>
  (send) => {
    const filterQueryValueFromUrl =
      urlStateStorage.get(filterStateKey) ?? requiredDefaultFilterStateValue;
    const filterQueryE = decodeFilterQueryValueFromUrl(filterQueryValueFromUrl);

    // NOTE: Access logPosition for backwards compatibility with values previously stored under that key.
    const positionQueryValueFromUrl = urlStateStorage.get(positionStateKey) ?? {};
    const positionQueryE = decodePositionQueryValueFromUrl(positionQueryValueFromUrl);

    if (Either.isLeft(filterQueryE) || Either.isLeft(positionQueryE)) {
      withNotifyOnErrors(toastsService).onGetError(
        createPlainError(
          formatErrors([
            ...(Either.isLeft(filterQueryE) ? filterQueryE.left : []),
            ...(Either.isLeft(positionQueryE) ? positionQueryE.left : []),
          ])
        )
      );

      send({
        type: 'INITIALIZED_FROM_URL',
        query: defaultFilterStateValue.query,
        filters: defaultFilterStateValue.filters,
        timeRange: null,
        refreshInterval: null,
      });
    } else {
      send({
        type: 'INITIALIZED_FROM_URL',
        query: filterQueryE.right.query ?? defaultFilterStateValue.query,
        filters: filterQueryE.right.filters ?? defaultFilterStateValue.filters,
        timeRange: pipe(
          // Via the logFilter key
          pipe(
            filterQueryE.right.timeRange,
            Either.fromNullable(null),
            Either.chain(({ from, to }) =>
              from && to ? Either.right({ from, to }) : Either.left(null)
            )
          ),
          // Via the legacy logPosition key, and start / end timeRange parameters
          Either.alt(() =>
            pipe(
              positionQueryE.right,
              Either.fromNullable(null),
              Either.chain(({ start, end }) =>
                start && end ? Either.right({ from: start, to: end }) : Either.left(null)
              )
            )
          ),
          // Via the legacy logPosition key, and deriving from / to from position.time
          Either.alt(() =>
            pipe(
              positionQueryE.right,
              Either.fromNullable(null),
              Either.chain(({ position }) =>
                position && position.time
                  ? Either.right({
                      from: getTimeRangeStartFromTime(position.time),
                      to: getTimeRangeEndFromTime(position.time),
                    })
                  : Either.left(null)
              )
            )
          ),
          Either.fold(identity, identity)
        ),
        refreshInterval: pipe(
          // Via the logFilter key
          pipe(filterQueryE.right.refreshInterval, Either.fromNullable(null)),
          // Via the legacy logPosition key, and the boolean streamLive parameter
          Either.alt(() =>
            pipe(
              positionQueryE.right,
              Either.fromNullable(null),
              Either.chain(({ streamLive }) =>
                typeof streamLive === 'boolean'
                  ? Either.right({
                      pause: !streamLive,
                      value: defaultFilterStateValue.refreshInterval.value, // NOTE: Was not previously synced to the URL, so falls straight to the default.
                    })
                  : Either.left(null)
              )
            )
          ),
          Either.fold(identity, identity)
        ),
      });
    }
  };

const filterMeta = rt.partial({
  alias: rt.union([rt.string, rt.null]),
  disabled: rt.boolean,
  negate: rt.boolean,
  controlledBy: rt.string,
  group: rt.string,
  index: rt.string,
  isMultiIndex: rt.boolean,
  type: rt.string,
  key: rt.string,
  params: rt.any,
  value: rt.any,
});

const filter = rt.intersection([
  rt.type({
    meta: filterMeta,
  }),
  rt.partial({
    query: rt.UnknownRecord,
  }),
]);

const filterStateInUrlRT = rt.partial({
  query: rt.union([
    rt.strict({
      language: rt.string,
      query: rt.union([rt.string, rt.record(rt.string, rt.unknown)]),
    }),
    rt.strict({
      sql: rt.string,
    }),
    rt.strict({
      esql: rt.string,
    }),
  ]),
  filters: rt.array(filter),
  timeRange: rt.strict({
    from: rt.string,
    to: rt.string,
  }),
  refreshInterval: rt.strict({
    pause: rt.boolean,
    value: rt.number,
  }),
});

export type FilterStateInUrl = rt.TypeOf<typeof filterStateInUrlRT>;

const legacyFilterStateInUrlRT = rt.union([
  rt.strict({
    language: rt.string,
    query: rt.union([rt.string, rt.record(rt.string, rt.unknown)]),
  }),
  rt.strict({
    sql: rt.string,
  }),
  rt.strict({
    esql: rt.string,
  }),
]);

const legacyLegacyFilterStateWithExpressionInUrlRT = rt.type({
  kind: rt.literal('kuery'),
  expression: rt.string,
});

export const legacyPositionStateInUrlRT = rt.partial({
  streamLive: rt.boolean,
  start: datemathStringRT,
  end: datemathStringRT,
  position: rt.union([rt.partial(minimalTimeKeyRT.props), rt.null]),
});

const decodeFilterQueryValueFromUrl = (queryValueFromUrl: unknown) =>
  Either.getAltValidation(Array.getMonoid<rt.ValidationError>()).alt<FilterStateInUrl>(
    pipe(
      pipe(
        legacyLegacyFilterStateWithExpressionInUrlRT.decode(queryValueFromUrl),
        Either.map(({ expression, kind }) => ({ query: { language: kind, query: expression } }))
      ),
      Either.alt(() =>
        pipe(
          legacyFilterStateInUrlRT.decode(queryValueFromUrl),
          Either.map((legacyQuery) => ({ query: legacyQuery }))
        )
      )
    ),
    () => filterStateInUrlRT.decode(queryValueFromUrl)
  );

const decodePositionQueryValueFromUrl = (queryValueFromUrl: unknown) => {
  return legacyPositionStateInUrlRT.decode(queryValueFromUrl);
};

export const replaceLogFilterInQueryString = (query: Query, time?: number, timeRange?: TimeRange) =>
  replaceStateKeyInQueryString<FilterStateInUrl>(defaultFilterStateKey, {
    query,
    ...getTimeRange(time, timeRange),
    refreshInterval: DEFAULT_REFRESH_INTERVAL,
  });

const getTimeRange = (time?: number, timeRange?: TimeRange) => {
  if (timeRange) {
    return {
      timeRange: {
        from: new Date(timeRange.startTime).toISOString(),
        to: new Date(timeRange.endTime).toISOString(),
      },
    };
  } else if (time) {
    return {
      timeRange: {
        from: getTimeRangeStartFromTime(time),
        to: getTimeRangeEndFromTime(time),
      },
    };
  } else {
    return {};
  }
};

const defaultTimeRangeFromPositionOffset: DurationInputObject = { hours: 1 };

const getTimeRangeStartFromTime = (time: number): string =>
  moment(time).subtract(defaultTimeRangeFromPositionOffset).toISOString();

const getTimeRangeEndFromTime = (time: number): string =>
  moment(time).add(defaultTimeRangeFromPositionOffset).toISOString();
