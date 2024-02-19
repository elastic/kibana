/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IKbnUrlStateStorage } from '@kbn/kibana-utils-plugin/public';
import * as Array from 'fp-ts/lib/Array';
import * as Either from 'fp-ts/lib/Either';
import { identity, pipe } from 'fp-ts/lib/function';
import * as rt from 'io-ts';
import { InvokeCreator } from 'xstate';
// import { createPlainError, formatErrors } from '@kbn/io-ts-utils';
import { controlPanelsRT, HostsViewQueryContext, HostsViewQueryEvent, ParsedQuery } from './types';
import { DEFAULT_FILTERS, DEFAULT_QUERY, DEFAULT_TIMERANGE } from './defaults';
import { cleanControlPanels, defaultControlPanels } from './custom_controls_state_service';

interface HostsViewQueryUrlStateDependencies {
  filterStateKey?: string;
  urlStateStorage: IKbnUrlStateStorage;
}

interface HostsViewControlPanelsUrlStateDependencies {
  controlPanelsStateKey?: string;
  urlStateStorage: IKbnUrlStateStorage;
}

type HostsViewInitializeUrlStateDependencies = HostsViewQueryUrlStateDependencies &
  HostsViewControlPanelsUrlStateDependencies;

type RequiredDefaults = Required<Omit<FilterStateInUrl, 'timeRange' | 'controlPanels'>>;
type OptionalDefaults = Pick<FilterStateInUrl, 'timeRange'>;
type FullDefaults = Required<RequiredDefaults & OptionalDefaults>;

const requiredDefaultFilterStateValue: RequiredDefaults = {
  query: DEFAULT_QUERY,
  filters: DEFAULT_FILTERS,
  panelFilters: DEFAULT_FILTERS,
};

const optionalDefaultFilterStateValue = {
  timeRange: DEFAULT_TIMERANGE,
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

export const updateFilterContextInUrl =
  ({ urlStateStorage, filterStateKey = '_a' }: HostsViewQueryUrlStateDependencies) =>
  (context: HostsViewQueryContext, _event: HostsViewQueryEvent) => {
    if (
      !('query' in context) ||
      !('filters' in context) ||
      !('timeRange' in context) ||
      !('panelFilters' in context)
    ) {
      throw new Error('Missing keys from context needed to sync to the URL');
    }

    urlStateStorage.set(
      filterStateKey,
      filterStateInUrlRT.encode({
        query: context.query,
        filters: context.filters,
        timeRange: context.timeRange,
        panelFilters: context.panelFilters,
      }),
      { replace: true }
    );
  };

export const updateControlPanelsContextInUrl =
  ({
    urlStateStorage,
    controlPanelsStateKey = 'controlPanels',
  }: HostsViewControlPanelsUrlStateDependencies) =>
  (context: HostsViewQueryContext, _event: HostsViewQueryEvent) => {
    if (!('controlPanels' in context)) {
      throw new Error('Missing keys from context needed to sync to the URL');
    }

    urlStateStorage.set(
      controlPanelsStateKey,
      controlPanelsRT.encode(cleanControlPanels(context.controlPanels ?? {})),
      { replace: true }
    );
  };

export const initializeFromUrl =
  ({
    filterStateKey = '_a',
    controlPanelsStateKey = 'controlPanels',
    urlStateStorage,
  }: HostsViewInitializeUrlStateDependencies): InvokeCreator<
    HostsViewQueryContext,
    HostsViewQueryEvent
  > =>
  (context, _event) =>
  (send) => {
    const filterQueryValueFromUrl =
      urlStateStorage.get(filterStateKey) ?? requiredDefaultFilterStateValue;
    const filterQueryE = decodeFilterQueryValueFromUrl(filterQueryValueFromUrl);

    const controlPanelsQueryValueFromUrl =
      urlStateStorage.get(controlPanelsStateKey) ?? defaultControlPanels;
    const controlPanelsQueryE = decodeControlPanelsQueryValueFromUrl(
      controlPanelsQueryValueFromUrl
    );

    if (Either.isLeft(filterQueryE) || Either.isLeft(controlPanelsQueryE)) {
      // withNotifyOnErrors(toastsService).onGetError(
      //   createPlainError(formatErrors([...(Either.isLeft(filterQueryE) ? filterQueryE.left : [])]))
      // );

      send({
        type: 'INITIALIZED_FROM_URL',
        query: defaultFilterStateValue.query,
        filters: defaultFilterStateValue.filters,
        panelFilters: defaultFilterStateValue.filters,
        timeRange: null,
        controlPanels: null,
      });
    } else {
      send({
        type: 'INITIALIZED_FROM_URL',
        query: filterQueryE.right.query ?? defaultFilterStateValue.query,
        filters: filterQueryE.right.filters ?? defaultFilterStateValue.filters,
        panelFilters: filterQueryE.right.panelFilters ?? defaultFilterStateValue.filters,
        timeRange: pipe(
          pipe(
            filterQueryE.right.timeRange,
            Either.fromNullable(null),
            Either.chain(({ from, to }) =>
              from && to ? Either.right({ from, to }) : Either.left(null)
            )
          ),
          Either.fold(identity, identity)
        ),
        controlPanels: controlPanelsQueryE.right,
      });
    }
  };

const legacyLegacyFilterStateWithExpressionInUrlRT = rt.type({
  kind: rt.literal('kuery'),
  expression: rt.string,
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

const decodeControlPanelsQueryValueFromUrl = (controlPanelsValueFromUrl: unknown) =>
  controlPanelsRT.decode(controlPanelsValueFromUrl);

export type FilterStateInUrl = rt.TypeOf<typeof filterStateInUrlRT>;

export const filterMeta = rt.partial({
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

export const filter = rt.intersection([
  rt.type({
    meta: filterMeta,
  }),
  rt.partial({
    query: rt.UnknownRecord,
  }),
]);

export const filterStateInUrlRT = rt.partial({
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
  panelFilters: rt.array(filter),
  timeRange: rt.strict({
    from: rt.string,
    to: rt.string,
  }),
});

export const legacyFilterStateInUrlRT = rt.union([
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
