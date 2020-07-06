/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getOr } from 'lodash/fp';
import React, { useCallback } from 'react';
import { connect, ConnectedProps } from 'react-redux';
import { Dispatch } from 'redux';
import deepEqual from 'fast-deep-equal';

import {
  Filter,
  FilterManager,
  IIndexPattern,
} from '../../../../../../../../src/plugins/data/public';
import { BrowserFields } from '../../../../common/containers/source';
import { convertKueryToElasticSearchQuery } from '../../../../common/lib/keury';
import {
  KueryFilterQuery,
  SerializedFilterQuery,
  State,
  inputsModel,
  inputsSelectors,
} from '../../../../common/store';
import { timelineActions, timelineSelectors } from '../../../store/timeline';
import { KqlMode, TimelineModel, EventType } from '../../../../timelines/store/timeline/model';
import { timelineDefaults } from '../../../../timelines/store/timeline/defaults';
import { dispatchUpdateReduxTime } from '../../../../common/components/super_date_picker';
import { SearchOrFilter } from './search_or_filter';

interface OwnProps {
  browserFields: BrowserFields;
  filterManager: FilterManager;
  indexPattern: IIndexPattern;
  timelineId: string;
}

type Props = OwnProps & PropsFromRedux;

const StatefulSearchOrFilterComponent = React.memo<Props>(
  ({
    applyKqlFilterQuery,
    browserFields,
    dataProviders,
    eventType,
    filters,
    filterManager,
    filterQuery,
    filterQueryDraft,
    from,
    fromStr,
    indexPattern,
    isRefreshPaused,
    kqlMode,
    refreshInterval,
    savedQueryId,
    setFilters,
    setKqlFilterQueryDraft,
    setSavedQueryId,
    timelineId,
    to,
    toStr,
    updateEventType,
    updateKqlMode,
    updateReduxTime,
  }) => {
    const applyFilterQueryFromKueryExpression = useCallback(
      (expression: string, kind) =>
        applyKqlFilterQuery({
          id: timelineId,
          filterQuery: {
            kuery: {
              kind,
              expression,
            },
            serializedQuery: convertKueryToElasticSearchQuery(expression, indexPattern),
          },
        }),
      // eslint-disable-next-line react-hooks/exhaustive-deps
      [indexPattern, timelineId]
    );

    const setFilterQueryDraftFromKueryExpression = useCallback(
      (expression: string, kind) =>
        setKqlFilterQueryDraft({
          id: timelineId,
          filterQueryDraft: {
            kind,
            expression,
          },
        }),
      // eslint-disable-next-line react-hooks/exhaustive-deps
      [timelineId]
    );

    const setFiltersInTimeline = useCallback(
      (newFilters: Filter[]) =>
        setFilters({
          id: timelineId,
          filters: newFilters,
        }),
      // eslint-disable-next-line react-hooks/exhaustive-deps
      [timelineId]
    );

    const setSavedQueryInTimeline = useCallback(
      (newSavedQueryId: string | null) =>
        setSavedQueryId({
          id: timelineId,
          savedQueryId: newSavedQueryId,
        }),
      // eslint-disable-next-line react-hooks/exhaustive-deps
      [timelineId]
    );

    const handleUpdateEventType = useCallback(
      (newEventType: EventType) =>
        updateEventType({
          id: timelineId,
          eventType: newEventType,
        }),
      // eslint-disable-next-line react-hooks/exhaustive-deps
      [timelineId]
    );

    return (
      <SearchOrFilter
        applyKqlFilterQuery={applyFilterQueryFromKueryExpression}
        browserFields={browserFields}
        dataProviders={dataProviders}
        eventType={eventType}
        filters={filters}
        filterManager={filterManager}
        filterQuery={filterQuery}
        filterQueryDraft={filterQueryDraft}
        from={from}
        fromStr={fromStr}
        indexPattern={indexPattern}
        isRefreshPaused={isRefreshPaused}
        kqlMode={kqlMode!}
        refreshInterval={refreshInterval}
        savedQueryId={savedQueryId}
        setFilters={setFiltersInTimeline}
        setKqlFilterQueryDraft={setFilterQueryDraftFromKueryExpression!}
        setSavedQueryId={setSavedQueryInTimeline}
        timelineId={timelineId}
        to={to}
        toStr={toStr}
        updateEventType={handleUpdateEventType}
        updateKqlMode={updateKqlMode!}
        updateReduxTime={updateReduxTime}
      />
    );
  },
  (prevProps, nextProps) => {
    return (
      prevProps.eventType === nextProps.eventType &&
      prevProps.filterManager === nextProps.filterManager &&
      prevProps.from === nextProps.from &&
      prevProps.fromStr === nextProps.fromStr &&
      prevProps.to === nextProps.to &&
      prevProps.toStr === nextProps.toStr &&
      prevProps.isRefreshPaused === nextProps.isRefreshPaused &&
      prevProps.refreshInterval === nextProps.refreshInterval &&
      prevProps.timelineId === nextProps.timelineId &&
      deepEqual(prevProps.browserFields, nextProps.browserFields) &&
      deepEqual(prevProps.dataProviders, nextProps.dataProviders) &&
      deepEqual(prevProps.filters, nextProps.filters) &&
      deepEqual(prevProps.filterQuery, nextProps.filterQuery) &&
      deepEqual(prevProps.filterQueryDraft, nextProps.filterQueryDraft) &&
      deepEqual(prevProps.indexPattern, nextProps.indexPattern) &&
      deepEqual(prevProps.kqlMode, nextProps.kqlMode) &&
      deepEqual(prevProps.savedQueryId, nextProps.savedQueryId) &&
      deepEqual(prevProps.timelineId, nextProps.timelineId)
    );
  }
);
StatefulSearchOrFilterComponent.displayName = 'StatefulSearchOrFilterComponent';

const makeMapStateToProps = () => {
  const getTimeline = timelineSelectors.getTimelineByIdSelector();
  const getKqlFilterQueryDraft = timelineSelectors.getKqlFilterQueryDraftSelector();
  const getKqlFilterQuery = timelineSelectors.getKqlFilterKuerySelector();
  const getInputsTimeline = inputsSelectors.getTimelineSelector();
  const getInputsPolicy = inputsSelectors.getTimelinePolicySelector();
  const mapStateToProps = (state: State, { timelineId }: OwnProps) => {
    const timeline: TimelineModel = getTimeline(state, timelineId) ?? timelineDefaults;
    const input: inputsModel.InputsRange = getInputsTimeline(state);
    const policy: inputsModel.Policy = getInputsPolicy(state);
    return {
      dataProviders: timeline.dataProviders,
      eventType: timeline.eventType ?? 'raw',
      filterQuery: getKqlFilterQuery(state, timelineId)!,
      filterQueryDraft: getKqlFilterQueryDraft(state, timelineId)!,
      filters: timeline.filters!,
      from: input.timerange.from,
      fromStr: input.timerange.fromStr!,
      isRefreshPaused: policy.kind === 'manual',
      kqlMode: getOr('filter', 'kqlMode', timeline),
      refreshInterval: policy.duration,
      savedQueryId: getOr(null, 'savedQueryId', timeline),
      to: input.timerange.to,
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
  updateEventType: ({ id, eventType }: { id: string; eventType: EventType }) =>
    dispatch(timelineActions.updateEventType({ id, eventType })),
  updateKqlMode: ({ id, kqlMode }: { id: string; kqlMode: KqlMode }) =>
    dispatch(timelineActions.updateKqlMode({ id, kqlMode })),
  setKqlFilterQueryDraft: ({
    id,
    filterQueryDraft,
  }: {
    id: string;
    filterQueryDraft: KueryFilterQuery;
  }) =>
    dispatch(
      timelineActions.setKqlFilterQueryDraft({
        id,
        filterQueryDraft,
      })
    ),
  setSavedQueryId: ({ id, savedQueryId }: { id: string; savedQueryId: string | null }) =>
    dispatch(timelineActions.setSavedQueryId({ id, savedQueryId })),
  setFilters: ({ id, filters }: { id: string; filters: Filter[] }) =>
    dispatch(timelineActions.setFilters({ id, filters })),
  updateReduxTime: dispatchUpdateReduxTime(dispatch),
});

export const connector = connect(makeMapStateToProps, mapDispatchToProps);

type PropsFromRedux = ConnectedProps<typeof connector>;

export const StatefulSearchOrFilter = connector(StatefulSearchOrFilterComponent);
