/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getOr } from 'lodash/fp';
import React, { useCallback } from 'react';
import { connect, ConnectedProps } from 'react-redux';
import { Dispatch } from 'redux';
import deepEqual from 'fast-deep-equal';
import type { Filter } from '@kbn/es-query';

import type { FilterManager } from '@kbn/data-plugin/public';
import { State, inputsModel, inputsSelectors } from '../../../../common/store';
import { timelineActions, timelineSelectors } from '../../../store/timeline';
import { KqlMode, TimelineModel } from '../../../store/timeline/model';
import { timelineDefaults } from '../../../store/timeline/defaults';
import { dispatchUpdateReduxTime } from '../../../../common/components/super_date_picker';
import { SearchOrFilter } from './search_or_filter';
import { SerializedFilterQuery } from '../../../../../common/types/timeline';

interface OwnProps {
  filterManager: FilterManager;
  timelineId: string;
}

type Props = OwnProps & PropsFromRedux;

const StatefulSearchOrFilterComponent = React.memo<Props>(
  ({
    dataProviders,
    filters,
    filterManager,
    filterQuery,
    from,
    fromStr,
    isRefreshPaused,
    kqlMode,
    refreshInterval,
    savedQueryId,
    setFilters,
    setSavedQueryId,
    timelineId,
    to,
    toStr,
    updateKqlMode,
    updateReduxTime,
  }) => {
    const setFiltersInTimeline = useCallback(
      (newFilters: Filter[]) =>
        setFilters({
          id: timelineId,
          filters: newFilters,
        }),
      [timelineId, setFilters]
    );

    const setSavedQueryInTimeline = useCallback(
      (newSavedQueryId: string | null) =>
        setSavedQueryId({
          id: timelineId,
          savedQueryId: newSavedQueryId,
        }),
      [timelineId, setSavedQueryId]
    );

    return (
      <SearchOrFilter
        dataProviders={dataProviders}
        filters={filters}
        filterManager={filterManager}
        filterQuery={filterQuery}
        from={from}
        fromStr={fromStr}
        isRefreshPaused={isRefreshPaused}
        kqlMode={kqlMode}
        refreshInterval={refreshInterval}
        savedQueryId={savedQueryId}
        setFilters={setFiltersInTimeline}
        setSavedQueryId={setSavedQueryInTimeline}
        timelineId={timelineId}
        to={to}
        toStr={toStr}
        updateKqlMode={updateKqlMode}
        updateReduxTime={updateReduxTime}
      />
    );
  },
  (prevProps, nextProps) => {
    return (
      prevProps.filterManager === nextProps.filterManager &&
      prevProps.from === nextProps.from &&
      prevProps.fromStr === nextProps.fromStr &&
      prevProps.to === nextProps.to &&
      prevProps.toStr === nextProps.toStr &&
      prevProps.isRefreshPaused === nextProps.isRefreshPaused &&
      prevProps.refreshInterval === nextProps.refreshInterval &&
      prevProps.timelineId === nextProps.timelineId &&
      deepEqual(prevProps.dataProviders, nextProps.dataProviders) &&
      deepEqual(prevProps.filters, nextProps.filters) &&
      deepEqual(prevProps.filterQuery, nextProps.filterQuery) &&
      deepEqual(prevProps.kqlMode, nextProps.kqlMode) &&
      deepEqual(prevProps.savedQueryId, nextProps.savedQueryId) &&
      deepEqual(prevProps.timelineId, nextProps.timelineId)
    );
  }
);
StatefulSearchOrFilterComponent.displayName = 'StatefulSearchOrFilterComponent';

const makeMapStateToProps = () => {
  const getTimeline = timelineSelectors.getTimelineByIdSelector();
  const getKqlFilterQuery = timelineSelectors.getKqlFilterKuerySelector();
  const getInputsTimeline = inputsSelectors.getTimelineSelector();
  const getInputsPolicy = inputsSelectors.getTimelinePolicySelector();
  const mapStateToProps = (state: State, { timelineId }: OwnProps) => {
    const timeline: TimelineModel = getTimeline(state, timelineId) ?? timelineDefaults;
    const input: inputsModel.InputsRange = getInputsTimeline(state);
    const policy: inputsModel.Policy = getInputsPolicy(state);
    return {
      dataProviders: timeline.dataProviders,
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      filterQuery: getKqlFilterQuery(state, timelineId)!,
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      filters: timeline.filters!,
      from: input.timerange.from,
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      fromStr: input.timerange.fromStr!,
      isRefreshPaused: policy.kind === 'manual',
      kqlMode: getOr('filter', 'kqlMode', timeline),
      refreshInterval: policy.duration,
      savedQueryId: getOr(null, 'savedQueryId', timeline),
      to: input.timerange.to,
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      toStr: input.timerange.toStr!,
    };
  };
  return mapStateToProps;
};

const mapDispatchToProps = (dispatch: Dispatch) => ({
  applyKqlFilterQuery: ({ id, filterQuery }: { id: string; filterQuery: SerializedFilterQuery }) =>
    dispatch(
      timelineActions.applyKqlFilterQuery({
        id,
        filterQuery,
      })
    ),
  updateKqlMode: ({ id, kqlMode }: { id: string; kqlMode: KqlMode }) =>
    dispatch(timelineActions.updateKqlMode({ id, kqlMode })),
  setSavedQueryId: ({ id, savedQueryId }: { id: string; savedQueryId: string | null }) =>
    dispatch(timelineActions.setSavedQueryId({ id, savedQueryId })),
  setFilters: ({ id, filters }: { id: string; filters: Filter[] }) =>
    dispatch(timelineActions.setFilters({ id, filters })),
  updateReduxTime: dispatchUpdateReduxTime(dispatch),
});

export const connector = connect(makeMapStateToProps, mapDispatchToProps);

type PropsFromRedux = ConnectedProps<typeof connector>;

export const StatefulSearchOrFilter = connector(StatefulSearchOrFilterComponent);
