/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { isEmpty } from 'lodash/fp';
import React, { memo, useMemo, useCallback, useState, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { Subscription } from 'rxjs';
import deepEqual from 'fast-deep-equal';

import {
  IIndexPattern,
  Query,
  Filter,
  esFilters,
  FilterManager,
  SavedQuery,
  SavedQueryTimeFilter,
} from '../../../../../../../../src/plugins/data/public';

import { useShallowEqualSelector } from '../../../../common/hooks/use_selector';
import { timelineDefaults } from '../../../../timelines/store/timeline/defaults';
import { timelineActions, timelineSelectors } from '../../../store/timeline';
import { dispatchUpdateReduxTime } from '../../../../common/components/super_date_picker';
import { BrowserFields } from '../../../../common/containers/source';
import { convertKueryToElasticSearchQuery } from '../../../../common/lib/keury';
import { KueryFilterQueryKind, State, inputsSelectors } from '../../../../common/store';
import { KqlMode } from '../../../../timelines/store/timeline/model';
import { useSavedQueryServices } from '../../../../common/utils/saved_query_services';
import { QueryBar } from '../../../../common/components/query_bar';
import { buildGlobalQuery } from '../helpers';

export interface QueryBarTimelineComponentProps {
  browserFields: BrowserFields;
  filterManager: FilterManager;
  kqlMode: KqlMode;
  indexPattern: IIndexPattern;
  timelineId: string;
}

export const TIMELINE_FILTER_DROP_AREA = 'timeline-filter-drop-area';

const getNonDropAreaFilters = (filters: Filter[] = []) =>
  filters.filter((f: Filter) => f.meta.controlledBy !== TIMELINE_FILTER_DROP_AREA);

export const QueryBarTimeline = memo<QueryBarTimelineComponentProps>(
  ({ browserFields, filterManager, kqlMode, indexPattern, timelineId }) => {
    const getTimeline = timelineSelectors.getTimelineByIdSelector();
    const getInputsTimeline = inputsSelectors.getTimelineSelector();
    const getInputsPolicy = inputsSelectors.getTimelinePolicySelector();
    const getKqlFilterQuery = timelineSelectors.getKqlFilterKuerySelector();
    const dispatch = useDispatch();
    const { dataProviders, filters, savedQueryId } = useShallowEqualSelector(
      (state: State) => getTimeline(state, timelineId) ?? timelineDefaults
    );
    const {
      timerange: { to, toStr, from, fromStr },
    } = useShallowEqualSelector(getInputsTimeline);
    const { kind: policyKind, duration: refreshInterval } = useShallowEqualSelector(
      getInputsPolicy
    );
    const isRefreshPaused = useMemo(() => policyKind === 'manual', [policyKind]);
    const filterQuery = useShallowEqualSelector(
      (state: State) => getKqlFilterQuery(state, timelineId)!
    );

    const [dateRangeFrom, setDateRangeFrom] = useState<string>(
      fromStr != null ? fromStr : new Date(from).toISOString()
    );
    const [dateRangeTo, setDateRangTo] = useState<string>(
      toStr != null ? toStr : new Date(to).toISOString()
    );

    const updateReduxTime = useMemo(() => dispatchUpdateReduxTime(dispatch), [dispatch]);

    const [savedQuery, setSavedQuery] = useState<SavedQuery | undefined>(undefined);
    const [filterQueryConverted, setFilterQueryConverted] = useState<Query>({
      query: filterQuery?.expression ?? '',
      language: filterQuery?.kind ?? 'kuery',
    });
    const [dataProvidersDsl, setDataProvidersDsl] = useState<string>(
      convertKueryToElasticSearchQuery(buildGlobalQuery(dataProviders, browserFields), indexPattern)
    );
    const savedQueryServices = useSavedQueryServices();

    const setSavedQueryId = useCallback(
      (newSavedQueryId: string | null) =>
        dispatch(
          timelineActions.setSavedQueryId({
            id: timelineId,
            savedQueryId: newSavedQueryId,
          })
        ),
      [dispatch, timelineId]
    );

    const applyKqlFilterQuery = useCallback(
      (expression: string, kind) =>
        dispatch(
          timelineActions.applyKqlFilterQuery({
            id: timelineId,
            filterQuery: {
              kuery: {
                kind,
                expression,
              },
              serializedQuery: convertKueryToElasticSearchQuery(expression, indexPattern),
            },
          })
        ),
      [dispatch, indexPattern, timelineId]
    );

    const setFilters = useCallback(
      (newFilters: Filter[]) =>
        dispatch(
          timelineActions.setFilters({
            id: timelineId,
            filters: newFilters,
          })
        ),
      [dispatch, timelineId]
    );

    useEffect(() => {
      let isSubscribed = true;
      const subscriptions = new Subscription();
      filterManager.setFilters(filters!);

      subscriptions.add(
        filterManager.getUpdates$().subscribe({
          next: () => {
            if (isSubscribed) {
              const filterWithoutDropArea = getNonDropAreaFilters(filterManager.getFilters());
              setFilters(filterWithoutDropArea);
            }
          },
        })
      );

      return () => {
        isSubscribed = false;
        subscriptions.unsubscribe();
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
      const filterWithoutDropArea = getNonDropAreaFilters(filterManager.getFilters());
      if (!deepEqual(filters, filterWithoutDropArea)) {
        filterManager.setFilters(filters!);
      }
    }, [filterManager, filters]);

    useEffect(() => {
      setFilterQueryConverted({
        query: filterQuery?.expression ?? '',
        language: filterQuery?.kind ?? 'kuery',
      });
    }, [filterQuery]);

    useEffect(() => {
      setDataProvidersDsl(
        convertKueryToElasticSearchQuery(
          buildGlobalQuery(dataProviders, browserFields),
          indexPattern
        )
      );
    }, [dataProviders, browserFields, indexPattern]);

    useEffect(() => {
      if (fromStr != null && toStr != null) {
        setDateRangeFrom(fromStr);
        setDateRangTo(toStr);
      } else if (from != null && to != null) {
        setDateRangeFrom(new Date(from).toISOString());
        setDateRangTo(new Date(to).toISOString());
      }
    }, [from, fromStr, to, toStr]);

    useEffect(() => {
      let isSubscribed = true;
      async function setSavedQueryByServices() {
        if (savedQueryId != null && savedQueryServices != null) {
          try {
            // The getSavedQuery function will throw a promise rejection in
            // src/legacy/core_plugins/data/public/search/search_bar/lib/saved_query_service.ts
            // if the savedObjectsClient is undefined. This is happening in a test
            // so I wrapped this in a try catch to keep the unhandled promise rejection
            // warning from appearing in tests.
            const mySavedQuery = await savedQueryServices.getSavedQuery(savedQueryId);
            if (isSubscribed && mySavedQuery != null) {
              setSavedQuery({
                ...mySavedQuery,
                attributes: {
                  ...mySavedQuery.attributes,
                  filters: getNonDropAreaFilters(filters),
                },
              });
            }
          } catch (exc) {
            setSavedQuery(undefined);
          }
        } else if (isSubscribed) {
          setSavedQuery(undefined);
        }
      }
      setSavedQueryByServices();
      return () => {
        isSubscribed = false;
      };
    }, [filterManager, filters, savedQueryId, savedQueryServices]);

    const onSubmitQuery = useCallback(
      (newQuery: Query, timefilter?: SavedQueryTimeFilter) => {
        if (
          filterQuery == null ||
          (filterQuery != null && filterQuery.expression !== newQuery.query) ||
          filterQuery.kind !== newQuery.language
        ) {
          applyKqlFilterQuery(newQuery.query as string, newQuery.language as KueryFilterQueryKind);
        }
        if (timefilter != null) {
          const isQuickSelection = timefilter.from.includes('now') || timefilter.to.includes('now');

          updateReduxTime({
            id: 'timeline',
            end: timefilter.to,
            start: timefilter.from,
            isInvalid: false,
            isQuickSelection,
            timelineId,
          });
        }
      },
      [applyKqlFilterQuery, filterQuery, timelineId, updateReduxTime]
    );

    const onSavedQuery = useCallback(
      (newSavedQuery: SavedQuery | undefined) => {
        if (newSavedQuery != null) {
          if (newSavedQuery.id !== savedQueryId) {
            setSavedQueryId(newSavedQuery.id);
          }
          if (savedQueryServices != null && dataProvidersDsl !== '') {
            const dataProviderFilterExists =
              newSavedQuery.attributes.filters != null
                ? newSavedQuery.attributes.filters.findIndex(
                    (f) => f.meta.controlledBy === TIMELINE_FILTER_DROP_AREA
                  )
                : -1;
            savedQueryServices.saveQuery(
              {
                ...newSavedQuery.attributes,
                filters:
                  newSavedQuery.attributes.filters != null
                    ? dataProviderFilterExists > -1
                      ? [
                          ...newSavedQuery.attributes.filters.slice(0, dataProviderFilterExists),
                          getDataProviderFilter(dataProvidersDsl),
                          ...newSavedQuery.attributes.filters.slice(dataProviderFilterExists + 1),
                        ]
                      : [
                          ...newSavedQuery.attributes.filters,
                          getDataProviderFilter(dataProvidersDsl),
                        ]
                    : [],
              },
              {
                overwrite: true,
              }
            );
          }
        } else {
          applyKqlFilterQuery('', 'kuery');
          setSavedQueryId(null);
        }
      },
      [applyKqlFilterQuery, dataProvidersDsl, savedQueryId, savedQueryServices, setSavedQueryId]
    );

    return (
      <QueryBar
        dateRangeFrom={dateRangeFrom}
        dateRangeTo={dateRangeTo}
        hideSavedQuery={kqlMode === 'search'}
        indexPattern={indexPattern}
        isRefreshPaused={isRefreshPaused}
        filterQuery={filterQueryConverted}
        filterManager={filterManager}
        filters={filters!}
        onSubmitQuery={onSubmitQuery}
        refreshInterval={refreshInterval}
        savedQuery={savedQuery}
        onSavedQuery={onSavedQuery}
        dataTestSubj={'timelineQueryInput'}
      />
    );
  }
);

export const getDataProviderFilter = (dataProviderDsl: string): Filter => {
  const dslObject = JSON.parse(dataProviderDsl);
  const key = Object.keys(dslObject);
  return {
    ...dslObject,
    meta: {
      alias: TIMELINE_FILTER_DROP_AREA,
      controlledBy: TIMELINE_FILTER_DROP_AREA,
      negate: false,
      disabled: false,
      type: 'custom',
      key: isEmpty(key) ? 'bool' : key[0],
      value: dataProviderDsl,
    },
    $state: {
      store: esFilters.FilterStateStore.APP_STATE,
    },
  };
};
