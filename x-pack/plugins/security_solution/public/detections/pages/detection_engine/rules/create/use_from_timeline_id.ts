/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEmpty } from 'lodash/fp';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  convertKueryToElasticSearchQuery,
  updateIsLoading as dispatchUpdateIsLoading,
} from '@kbn/timelines-plugin/public';
import { useDispatch } from 'react-redux';
import { sourcererActions } from '../../../../../common/store/sourcerer';
import { sourcererSelectors } from '../../../../../common/store';
import { useDeepEqualSelector } from '../../../../../common/hooks/use_selector';
import type { TimelineModel } from '../../../../..';
import {
  dispatchUpdateTimeline,
  queryTimelineById,
} from '../../../../../timelines/components/open_timeline/helpers';
import type { FieldValueQueryBar } from '../../../../components/rules/query_bar';
import { useGetInitialUrlParamValue } from '../../../../../common/utils/global_query_string/helpers';
import { buildGlobalQuery } from '../../../../../timelines/components/timeline/helpers';
import { getDataProviderFilter } from '../../../../../timelines/components/timeline/query_bar';
import { SourcererScopeName } from '../../../../../common/store/sourcerer/model';

export const FROM_TIMELINE_ID_URL_PARAM = 'createRuleFromTimelineId';

interface UseFromTimelineId {
  index: string[];
  queryBar: FieldValueQueryBar;
}

interface FromTimelineId {
  index: string[];
  loading: boolean;
  queryBar: FieldValueQueryBar;
  updated: boolean;
}

export const useFromTimelineId = (initialState: UseFromTimelineId): FromTimelineId => {
  const dispatch = useDispatch();

  const [loading, setLoading] = useState(true);
  const [fromTimeline, setFromTimeline] = useState<TimelineModel | null>(null);
  const [ruleData, setRuleData] = useState<{
    index: string[];
    queryBar: FieldValueQueryBar;
    updated: boolean;
  }>({
    ...initialState,
    updated: false,
  });

  const getInitialUrlParamValue = useGetInitialUrlParamValue<string>(FROM_TIMELINE_ID_URL_PARAM);
  const { decodedParam: fromTimelineId } = useMemo(getInitialUrlParamValue, [
    getInitialUrlParamValue,
  ]);

  const sourcererScopeSelector = useMemo(() => sourcererSelectors.getSourcererScopeSelector(), []);
  const { selectedDataView, sourcererScope } = useDeepEqualSelector((state) =>
    sourcererScopeSelector(state, SourcererScopeName.timeline)
  );
  const [ogDataView] = useState({ selectedDataView, sourcererScope });

  const selectedDataViewBrowserFields = useMemo(() => {
    if (selectedDataView == null) {
      setLoading(false);
      throw Error('timeline data view has been deleted, update timeline to fix this error');
    }

    if (
      fromTimeline == null ||
      fromTimeline.dataViewId == null ||
      selectedDataView.id !== fromTimeline.dataViewId
    ) {
      return null;
    }

    if (isEmpty(selectedDataView.browserFields)) {
      return null;
    }

    return selectedDataView.browserFields;
  }, [selectedDataView, fromTimeline]);

  useEffect(() => {
    if (selectedDataViewBrowserFields != null) {
      setTheState();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDataViewBrowserFields]);

  const setTheState = useCallback(() => {
    if (fromTimeline == null || selectedDataView == null || selectedDataViewBrowserFields == null)
      return;
    const indexPattern = fromTimeline.indexNames.length
      ? fromTimeline.indexNames
      : selectedDataView.patternList;
    const newQuery = {
      query: fromTimeline.kqlQuery.filterQuery?.kuery?.expression ?? '',
      language: fromTimeline.kqlQuery.filterQuery?.kuery?.kind ?? 'kuery',
    };
    const dataProvidersDsl =
      fromTimeline.dataProviders != null && fromTimeline.dataProviders.length > 0
        ? convertKueryToElasticSearchQuery(
            buildGlobalQuery(fromTimeline.dataProviders, selectedDataViewBrowserFields),
            { fields: [], title: indexPattern.join(',') }
          )
        : '';

    const newFilters = fromTimeline.filters ?? [];
    // if something goes wrong and we don't hit this
    // the create new rule page will be unusable
    // probably need to add some sort of timer and in case we don't hit it we show error???
    setLoading(false);

    setRuleData({
      index: indexPattern,
      queryBar: {
        filters:
          dataProvidersDsl !== ''
            ? [...newFilters, getDataProviderFilter(dataProvidersDsl)]
            : newFilters,
        query: newQuery,
        saved_id: null,
      },
      updated: true,
    });
    // reset timeline data view once complete
    if (
      ogDataView.selectedDataView != null &&
      ogDataView.selectedDataView.id !== selectedDataView.id
    ) {
      dispatch(
        sourcererActions.setSelectedDataView({
          id: SourcererScopeName.timeline,
          selectedDataViewId: ogDataView.sourcererScope.selectedDataViewId,
          selectedPatterns: ogDataView.sourcererScope.selectedPatterns,
        })
      );
    }
  }, [fromTimeline, selectedDataView, selectedDataViewBrowserFields, ogDataView, dispatch]);

  const onOpenTimeline = useCallback(
    (timeline: TimelineModel) => {
      setFromTimeline(timeline);
      dispatch(
        sourcererActions.setSelectedDataView({
          id: SourcererScopeName.timeline,
          selectedDataViewId: timeline.dataViewId,
          selectedPatterns: timeline.indexNames,
        })
      );
    },
    [dispatch]
  );

  const getTimelineById = useCallback(
    (timelineId: string) =>
      queryTimelineById({
        timelineId,
        onOpenTimeline,
        updateIsLoading: ({
          id: currentTimelineId,
          isLoading,
        }: {
          id: string;
          isLoading: boolean;
        }) => dispatch(dispatchUpdateIsLoading({ id: currentTimelineId, isLoading })),
        updateTimeline: dispatchUpdateTimeline(dispatch),
      }),
    [dispatch, onOpenTimeline]
  );

  useEffect(() => {
    if (fromTimelineId != null) {
      getTimelineById(fromTimelineId);
    } else {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fromTimelineId]);

  return { loading, ...ruleData };
};
