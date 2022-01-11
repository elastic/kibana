/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { get, isEmpty } from 'lodash/fp';
import { Dispatch } from 'redux';

import { useCallback, useMemo } from 'react';
import { useDispatch } from 'react-redux';
import { useLocation } from 'react-router-dom';
import type { Filter, Query } from '@kbn/es-query';
import { ToggleDetailPanel } from '../../../../common/types/timeline';
import { inputsActions, sourcererActions } from '../../store/actions';
import { InputsModelId, TimeRangeKinds } from '../../store/inputs/constants';
import {
  UrlInputsModel,
  LinkTo,
  AbsoluteTimeRange,
  RelativeTimeRange,
} from '../../store/inputs/model';
import { TimelineUrl } from '../../../timelines/store/timeline/model';
import { CONSTANTS } from './constants';
import {
  decodeRisonUrlState,
  getParamFromQueryString,
  getQueryStringFromLocation,
  isDetectionsPages,
} from './helpers';
import { normalizeTimeRange } from './normalize_time_range';
import { SetInitialStateFromUrl } from './types';
import {
  queryTimelineById,
  dispatchUpdateTimeline,
} from '../../../timelines/components/open_timeline/helpers';
import { SourcererScopeName, SourcererUrlState } from '../../store/sourcerer/model';
import { timelineActions, timelineSelectors } from '../../../timelines/store/timeline';
import { useDeepEqualSelector } from '../../hooks/use_selector';

const getQueryStringKeyValue = ({ search, urlKey }: { search: string; urlKey: string }) =>
  getParamFromQueryString(getQueryStringFromLocation(search), urlKey);

const useInitializeDetailPanel = () => {
  const { search } = useLocation();
  const getTimeline = useMemo(() => timelineSelectors.getTimelineByIdSelector(), []);
  const urlDetailPanel = useMemo(
    () =>
      decodeRisonUrlState<ToggleDetailPanel>(
        getQueryStringKeyValue({
          search,
          urlKey: CONSTANTS.detailPanel,
        }) ?? undefined
      ),
    [search]
  );
  const timelineId = urlDetailPanel?.timelineId ?? '';
  const existingTimeline = useDeepEqualSelector((state) => getTimeline(state, timelineId));
  return { detailPanel: urlDetailPanel, wasTimelineCreated: existingTimeline != null };
};

export const useSetInitialStateFromUrl = () => {
  const dispatch = useDispatch();

  const updateTimeline = useMemo(() => dispatchUpdateTimeline(dispatch), [dispatch]);

  const updateTimelineIsLoading = useMemo(
    () => (status: { id: string; isLoading: boolean }) =>
      dispatch(timelineActions.updateIsLoading(status)),
    [dispatch]
  );

  const { detailPanel, wasTimelineCreated } = useInitializeDetailPanel();

  const setInitialStateFromUrl = useCallback(
    ({
      filterManager,
      indexPattern,
      pageName,
      savedQueries,
      urlStateToUpdate,
    }: SetInitialStateFromUrl) => {
      urlStateToUpdate.forEach(({ urlKey, newUrlStateString }) => {
        if (urlKey === CONSTANTS.timerange) {
          updateTimerange(newUrlStateString, dispatch);
        }
        if (urlKey === CONSTANTS.sourcerer) {
          const sourcererState = decodeRisonUrlState<SourcererUrlState>(newUrlStateString);
          if (sourcererState != null) {
            const activeScopes: SourcererScopeName[] = Object.keys(sourcererState).filter(
              (key) => !(key === SourcererScopeName.default && isDetectionsPages(pageName))
            ) as SourcererScopeName[];
            activeScopes.forEach((scope) =>
              dispatch(
                sourcererActions.setSelectedDataView({
                  id: scope,
                  selectedDataViewId: sourcererState[scope]?.id ?? null,
                  selectedPatterns: sourcererState[scope]?.selectedPatterns ?? [],
                })
              )
            );
          }
        }

        if (urlKey === CONSTANTS.appQuery && indexPattern != null) {
          const appQuery = decodeRisonUrlState<Query>(newUrlStateString);
          if (appQuery != null) {
            dispatch(
              inputsActions.setFilterQuery({
                id: 'global',
                query: appQuery.query,
                language: appQuery.language,
              })
            );
          }
        }

        if (urlKey === CONSTANTS.filters) {
          const filters = decodeRisonUrlState<Filter[]>(newUrlStateString);
          filterManager.setFilters(filters || []);
        }

        if (urlKey === CONSTANTS.savedQuery) {
          const savedQueryId = decodeRisonUrlState<string>(newUrlStateString);
          if (savedQueryId != null && savedQueryId !== '') {
            savedQueries.getSavedQuery(savedQueryId).then((savedQueryData) => {
              filterManager.setFilters(savedQueryData.attributes.filters || []);
              dispatch(
                inputsActions.setFilterQuery({
                  id: 'global',
                  ...savedQueryData.attributes.query,
                })
              );
              dispatch(inputsActions.setSavedQuery({ id: 'global', savedQuery: savedQueryData }));
            });
          }
        }

        if (urlKey === CONSTANTS.timeline) {
          const timeline = decodeRisonUrlState<TimelineUrl>(newUrlStateString);
          if (timeline != null && timeline.id !== '') {
            queryTimelineById({
              activeTimelineTab: timeline.activeTab,
              duplicate: false,
              graphEventId: timeline.graphEventId,
              timelineId: timeline.id,
              openTimeline: timeline.isOpen,
              updateIsLoading: updateTimelineIsLoading,
              updateTimeline,
            });
          }
        }

        if (urlKey === CONSTANTS.detailPanel) {
          if (detailPanel != null && detailPanel.panelView && detailPanel.timelineId) {
            if (!wasTimelineCreated) {
              /**
               * Within a few views, the timeline is not created before the detail panel can be added,
               * So we create a default timeline to load the detail panel, which is then merged with
               * The accurate props required for the timeline when createTimeline is called from that component
               * Details on the merge are in addNewTimeline: x-pack/plugins/security_solution/public/timelines/store/timeline/helpers.ts
               * There is one scenario where the timelineById is created beforehand, and that is the flyout.
               * To prevent overriding any timelineById, we first check if it has been created before running the dispatch below
               */
              dispatch(
                timelineActions.createTimeline({
                  id: detailPanel.timelineId,
                  columns: [],
                  dataViewId: null,
                  indexNames: [],
                })
              );
            }
            dispatch(timelineActions.toggleDetailPanel({ ...detailPanel }));
          }
        }
      });
    },
    [dispatch, updateTimeline, updateTimelineIsLoading, wasTimelineCreated, detailPanel]
  );

  return Object.freeze({ setInitialStateFromUrl, updateTimeline, updateTimelineIsLoading });
};

const updateTimerange = (newUrlStateString: string, dispatch: Dispatch) => {
  const timerangeStateData = decodeRisonUrlState<UrlInputsModel>(newUrlStateString);

  const globalId: InputsModelId = 'global';
  const globalLinkTo: LinkTo = { linkTo: get('global.linkTo', timerangeStateData) };
  const globalType: TimeRangeKinds = get('global.timerange.kind', timerangeStateData);

  const timelineId: InputsModelId = 'timeline';
  const timelineLinkTo: LinkTo = { linkTo: get('timeline.linkTo', timerangeStateData) };
  const timelineType: TimeRangeKinds = get('timeline.timerange.kind', timerangeStateData);

  if (isEmpty(globalLinkTo.linkTo)) {
    dispatch(inputsActions.removeGlobalLinkTo());
  } else {
    dispatch(inputsActions.addGlobalLinkTo({ linkToId: 'timeline' }));
  }

  if (isEmpty(timelineLinkTo.linkTo)) {
    dispatch(inputsActions.removeTimelineLinkTo());
  } else {
    dispatch(inputsActions.addTimelineLinkTo({ linkToId: 'global' }));
  }

  if (timelineType) {
    if (timelineType === 'absolute') {
      const absoluteRange = normalizeTimeRange<AbsoluteTimeRange>(
        get('timeline.timerange', timerangeStateData)
      );

      dispatch(
        inputsActions.setAbsoluteRangeDatePicker({
          ...absoluteRange,
          id: timelineId,
        })
      );
    }

    if (timelineType === 'relative') {
      const relativeRange = normalizeTimeRange<RelativeTimeRange>(
        get('timeline.timerange', timerangeStateData)
      );

      dispatch(
        inputsActions.setRelativeRangeDatePicker({
          ...relativeRange,
          id: timelineId,
        })
      );
    }
  }

  if (globalType) {
    if (globalType === 'absolute') {
      const absoluteRange = normalizeTimeRange<AbsoluteTimeRange>(
        get('global.timerange', timerangeStateData)
      );

      dispatch(
        inputsActions.setAbsoluteRangeDatePicker({
          ...absoluteRange,
          id: globalId,
        })
      );
    }
    if (globalType === 'relative') {
      const relativeRange = normalizeTimeRange<RelativeTimeRange>(
        get('global.timerange', timerangeStateData)
      );

      dispatch(
        inputsActions.setRelativeRangeDatePicker({
          ...relativeRange,
          id: globalId,
        })
      );
    }
  }
};
