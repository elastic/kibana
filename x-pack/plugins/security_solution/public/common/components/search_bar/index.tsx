/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { set } from '@elastic/safer-lodash-set/fp';
import { getOr } from 'lodash/fp';
import React, { memo, useEffect, useCallback, useMemo } from 'react';
import { connect, ConnectedProps } from 'react-redux';
import { Dispatch } from 'redux';
import { Subscription } from 'rxjs';
import styled from 'styled-components';
import deepEqual from 'fast-deep-equal';
import {
  FilterManager,
  IIndexPattern,
  TimeRange,
  Query,
  Filter,
  SavedQuery,
} from 'src/plugins/data/public';

import { OnTimeChangeProps } from '@elastic/eui';

import { inputsActions } from '../../store/inputs';
import { InputsRange } from '../../store/inputs/model';
import { InputsModelId } from '../../store/inputs/constants';
import { State, inputsModel } from '../../store';
import { formatDate } from '../super_date_picker';
import {
  endSelector,
  filterQuerySelector,
  fromStrSelector,
  isLoadingSelector,
  queriesSelector,
  savedQuerySelector,
  startSelector,
  toStrSelector,
} from './selectors';
import { hostsActions } from '../../../hosts/store';
import { networkActions } from '../../../network/store';
import { timelineActions } from '../../../timelines/store/timeline';
import { useKibana } from '../../lib/kibana';

const APP_STATE_STORAGE_KEY = 'securitySolution.searchBar.appState';

interface SiemSearchBarProps {
  id: InputsModelId;
  indexPattern: IIndexPattern;
  timelineId?: string;
  dataTestSubj?: string;
}

const SearchBarContainer = styled.div`
  .globalQueryBar {
    padding: 0px;
  }
`;

export const SearchBarComponent = memo<SiemSearchBarProps & PropsFromRedux>(
  ({
    end,
    filterQuery,
    fromStr,
    id,
    indexPattern,
    isLoading = false,
    queries,
    savedQuery,
    setSavedQuery,
    setSearchBarFilter,
    start,
    toStr,
    updateSearch,
    dataTestSubj,
  }) => {
    const {
      data: {
        query: {
          timefilter: { timefilter },
          filterManager,
        },
        ui: { SearchBar },
      },
      storage,
    } = useKibana().services;

    useEffect(() => {
      if (fromStr != null && toStr != null) {
        timefilter.setTime({ from: fromStr, to: toStr });
      } else if (start != null && end != null) {
        timefilter.setTime({
          from: new Date(start).toISOString(),
          to: new Date(end).toISOString(),
        });
      }
    }, [end, fromStr, start, timefilter, toStr]);

    const onQuerySubmit = useCallback(
      (payload: { dateRange: TimeRange; query?: Query }) => {
        const isQuickSelection =
          payload.dateRange.from.includes('now') || payload.dateRange.to.includes('now');
        let updateSearchBar: UpdateReduxSearchBar = {
          id,
          end: toStr != null ? toStr : new Date(end).toISOString(),
          start: fromStr != null ? fromStr : new Date(start).toISOString(),
          isInvalid: false,
          isQuickSelection,
          updateTime: false,
          filterManager,
        };
        let isStateUpdated = false;

        if (
          (isQuickSelection &&
            (fromStr !== payload.dateRange.from || toStr !== payload.dateRange.to)) ||
          (!isQuickSelection &&
            (start !== formatDate(payload.dateRange.from) ||
              end !== formatDate(payload.dateRange.to)))
        ) {
          isStateUpdated = true;
          updateSearchBar.updateTime = true;
          updateSearchBar.end = payload.dateRange.to;
          updateSearchBar.start = payload.dateRange.from;
        }

        if (payload.query != null && !deepEqual(payload.query, filterQuery)) {
          isStateUpdated = true;
          updateSearchBar = set('query', payload.query, updateSearchBar);
        }

        if (!isStateUpdated) {
          // That mean we are doing a refresh!
          if (isQuickSelection) {
            updateSearchBar.updateTime = true;
            updateSearchBar.end = payload.dateRange.to;
            updateSearchBar.start = payload.dateRange.from;
          } else {
            queries.forEach((q) => q.refetch && (q.refetch as inputsModel.Refetch)());
          }
        }

        window.setTimeout(() => updateSearch(updateSearchBar), 0);
      },
      [id, toStr, end, fromStr, start, filterManager, filterQuery, queries, updateSearch]
    );

    const onRefresh = useCallback(
      (payload: { dateRange: TimeRange }) => {
        if (payload.dateRange.from.includes('now') || payload.dateRange.to.includes('now')) {
          updateSearch({
            id,
            end: payload.dateRange.to,
            start: payload.dateRange.from,
            isInvalid: false,
            isQuickSelection: true,
            updateTime: true,
            filterManager,
          });
        } else {
          queries.forEach((q) => q.refetch && (q.refetch as inputsModel.Refetch)());
        }
      },
      [updateSearch, id, filterManager, queries]
    );

    const onSaved = useCallback(
      (newSavedQuery: SavedQuery) => {
        setSavedQuery({ id, savedQuery: newSavedQuery });
      },
      [id, setSavedQuery]
    );

    const onSavedQueryUpdated = useCallback(
      (savedQueryUpdated: SavedQuery) => {
        const isQuickSelection = savedQueryUpdated.attributes.timefilter
          ? savedQueryUpdated.attributes.timefilter.from.includes('now') ||
            savedQueryUpdated.attributes.timefilter.to.includes('now')
          : false;

        let updateSearchBar: UpdateReduxSearchBar = {
          id,
          filters: savedQueryUpdated.attributes.filters || [],
          end: toStr != null ? toStr : new Date(end).toISOString(),
          start: fromStr != null ? fromStr : new Date(start).toISOString(),
          isInvalid: false,
          isQuickSelection,
          updateTime: false,
          filterManager,
        };

        if (savedQueryUpdated.attributes.timefilter) {
          updateSearchBar.end = savedQueryUpdated.attributes.timefilter
            ? savedQueryUpdated.attributes.timefilter.to
            : updateSearchBar.end;
          updateSearchBar.start = savedQueryUpdated.attributes.timefilter
            ? savedQueryUpdated.attributes.timefilter.from
            : updateSearchBar.start;
          updateSearchBar.updateTime = true;
        }

        updateSearchBar = set('query', savedQueryUpdated.attributes.query, updateSearchBar);
        updateSearchBar = set('savedQuery', savedQueryUpdated, updateSearchBar);

        updateSearch(updateSearchBar);
      },
      [id, toStr, end, fromStr, start, filterManager, updateSearch]
    );

    const onClearSavedQuery = useCallback(() => {
      if (savedQuery != null) {
        updateSearch({
          id,
          filters: [],
          end: toStr != null ? toStr : new Date(end).toISOString(),
          start: fromStr != null ? fromStr : new Date(start).toISOString(),
          isInvalid: false,
          isQuickSelection: false,
          updateTime: false,
          query: {
            query: '',
            language: savedQuery.attributes.query.language,
          },
          resetSavedQuery: true,
          savedQuery: undefined,
          filterManager,
        });
      }
    }, [savedQuery, updateSearch, id, toStr, end, fromStr, start, filterManager]);

    const saveAppStateToStorage = useCallback(
      (filters: Filter[]) => storage.set(APP_STATE_STORAGE_KEY, filters),
      [storage]
    );

    const getAppStateFromStorage = useCallback(() => storage.get(APP_STATE_STORAGE_KEY) ?? [], [
      storage,
    ]);

    useEffect(() => {
      let isSubscribed = true;
      const subscriptions = new Subscription();

      subscriptions.add(
        filterManager.getUpdates$().subscribe({
          next: () => {
            if (isSubscribed) {
              saveAppStateToStorage(filterManager.getAppFilters());
              setSearchBarFilter({
                id,
                filters: filterManager.getFilters(),
              });
            }
          },
        })
      );

      // for the initial state
      filterManager.setAppFilters(getAppStateFromStorage());
      setSearchBarFilter({
        id,
        filters: filterManager.getFilters(),
      });

      return () => {
        isSubscribed = false;
        subscriptions.unsubscribe();
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const indexPatterns = useMemo(() => [indexPattern], [indexPattern]);

    return (
      <SearchBarContainer data-test-subj={`${id}DatePicker`}>
        <SearchBar
          appName="siem"
          isLoading={isLoading}
          indexPatterns={indexPatterns}
          query={filterQuery}
          onClearSavedQuery={onClearSavedQuery}
          onQuerySubmit={onQuerySubmit}
          onRefresh={onRefresh}
          onSaved={onSaved}
          onSavedQueryUpdated={onSavedQueryUpdated}
          savedQuery={savedQuery}
          showFilterBar={true}
          showDatePicker={true}
          showQueryBar={true}
          showQueryInput={true}
          showSaveQuery={true}
          dataTestSubj={dataTestSubj}
        />
      </SearchBarContainer>
    );
  }
);

const makeMapStateToProps = () => {
  const getEndSelector = endSelector();
  const getFromStrSelector = fromStrSelector();
  const getIsLoadingSelector = isLoadingSelector();
  const getQueriesSelector = queriesSelector();
  const getStartSelector = startSelector();
  const getToStrSelector = toStrSelector();
  const getFilterQuerySelector = filterQuerySelector();
  const getSavedQuerySelector = savedQuerySelector();
  return (state: State, { id }: SiemSearchBarProps) => {
    const inputsRange: InputsRange = getOr({}, `inputs.${id}`, state);
    return {
      end: getEndSelector(inputsRange),
      fromStr: getFromStrSelector(inputsRange),
      filterQuery: getFilterQuerySelector(inputsRange),
      isLoading: getIsLoadingSelector(inputsRange),
      queries: getQueriesSelector(inputsRange),
      savedQuery: getSavedQuerySelector(inputsRange),
      start: getStartSelector(inputsRange),
      toStr: getToStrSelector(inputsRange),
    };
  };
};

SearchBarComponent.displayName = 'SiemSearchBar';

interface UpdateReduxSearchBar extends OnTimeChangeProps {
  id: InputsModelId;
  filters?: Filter[];
  filterManager: FilterManager;
  query?: Query;
  savedQuery?: SavedQuery;
  resetSavedQuery?: boolean;
  timelineId?: string;
  updateTime: boolean;
}

export const dispatchUpdateSearch = (dispatch: Dispatch) => ({
  end,
  filters,
  id,
  isQuickSelection,
  query,
  resetSavedQuery,
  savedQuery,
  start,
  timelineId,
  filterManager,
  updateTime = false,
}: UpdateReduxSearchBar): void => {
  if (updateTime) {
    const fromDate = formatDate(start);
    let toDate = formatDate(end, { roundUp: true });
    if (isQuickSelection) {
      dispatch(
        inputsActions.setRelativeRangeDatePicker({
          id,
          fromStr: start,
          toStr: end,
          from: fromDate,
          to: toDate,
        })
      );
    } else {
      toDate = formatDate(end);
      dispatch(
        inputsActions.setAbsoluteRangeDatePicker({
          id,
          from: formatDate(start),
          to: formatDate(end),
        })
      );
    }
    if (timelineId != null) {
      dispatch(
        timelineActions.updateRange({
          id: timelineId,
          start: fromDate,
          end: toDate,
        })
      );
    }
  }
  if (query != null) {
    dispatch(
      inputsActions.setFilterQuery({
        id,
        ...query,
      })
    );
  }
  if (filters != null) {
    filterManager.setFilters(filters);
  }
  if (savedQuery != null || resetSavedQuery) {
    dispatch(inputsActions.setSavedQuery({ id, savedQuery }));
  }

  dispatch(hostsActions.setHostTablesActivePageToZero());
  dispatch(networkActions.setNetworkTablesActivePageToZero());
};

const mapDispatchToProps = (dispatch: Dispatch) => ({
  updateSearch: dispatchUpdateSearch(dispatch),
  setSavedQuery: ({ id, savedQuery }: { id: InputsModelId; savedQuery: SavedQuery | undefined }) =>
    dispatch(inputsActions.setSavedQuery({ id, savedQuery })),
  setSearchBarFilter: ({ id, filters }: { id: InputsModelId; filters: Filter[] }) =>
    dispatch(inputsActions.setSearchBarFilter({ id, filters })),
});

export const connector = connect(makeMapStateToProps, mapDispatchToProps);

type PropsFromRedux = ConnectedProps<typeof connector>;

export const SiemSearchBar = connector(SearchBarComponent);
