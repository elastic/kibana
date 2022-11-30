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

import { useSourcererDataView } from '../../../../common/containers/sourcerer';
import type { TimelineModel } from '../../../..';
import type { FieldValueQueryBar } from '../../../components/rules/query_bar';
import { sourcererActions } from '../../../../common/store/sourcerer';
import {
  dispatchUpdateTimeline,
  queryTimelineById,
} from '../../../../timelines/components/open_timeline/helpers';
import { useGetInitialUrlParamValue } from '../../../../common/utils/global_query_string/helpers';
import { buildGlobalQuery } from '../../../../timelines/components/timeline/helpers';
import { getDataProviderFilter } from '../../../../timelines/components/timeline/query_bar';
import { SourcererScopeName } from '../../../../common/store/sourcerer/model';

export const RULE_FROM_TIMELINE_URL_PARAM = 'createRuleFromTimeline';

interface RuleFromTimeline {
  index: string[];
  loading: boolean;
  onOpenTimeline: (timeline: TimelineModel) => void;
  // callback to reset the updated state after update has happened
  handleReset: () => void;
  queryBar: FieldValueQueryBar;
  updated: boolean;
}

export const initialState = {
  index: [],
  queryBar: {
    query: { query: '', language: 'kuery' },
    filters: [],
    saved_id: null,
  },
  updated: false,
};

/**
 * When returned property updated === true,
 * the index and queryBar properties have been updated from timeline data
 * queried either from id in the url param or by passing a timeline to returned callback onOpenTimeline
 */
export const useRuleFromTimeline = (): RuleFromTimeline => {
  const dispatch = useDispatch();

  // selectedTimeline = timeline to set rule from
  const [selectedTimeline, setRuleFromTimeline] = useState<TimelineModel | null>(null);

  // start RuleFromTimeline definition
  const [loading, setLoading] = useState(true);

  const [ruleData, setRuleData] = useState<{
    index: string[];
    queryBar: FieldValueQueryBar;
    updated: boolean;
  }>(initialState);

  const onOpenTimeline = useCallback(
    (timeline: TimelineModel) => {
      setRuleFromTimeline(timeline);

      if (!isEmpty(timeline.indexNames)) {
        // let sourcerer manage the selected browser fields by setting timeline scope to the selected timeline data view
        // sourcerer handles the logic of if the fields have been fetched or need to be fetched
        dispatch(
          sourcererActions.setSelectedDataView({
            id: SourcererScopeName.timeline,
            selectedDataViewId: timeline.dataViewId,
            selectedPatterns: timeline.indexNames,
          })
        );
      }
    },
    [dispatch]
  );
  // end RuleFromTimeline definition

  // start browser field management
  const { browserFields, dataViewId, selectedPatterns } = useSourcererDataView(
    SourcererScopeName.timeline
  );

  const [ogDataView] = useState({ dataViewId, selectedPatterns });

  const selectedDataViewBrowserFields = useMemo(
    () =>
      selectedTimeline == null ||
      isEmpty(browserFields) ||
      (selectedTimeline.dataViewId !== null &&
        dataViewId !== null &&
        dataViewId !== selectedTimeline.dataViewId)
        ? null
        : browserFields,
    [browserFields, dataViewId, selectedTimeline]
  );
  // end browser field management

  // start set rule
  const handleSetRuleFromTimeline = useCallback(() => {
    if (selectedTimeline == null || selectedDataViewBrowserFields == null) return;
    const indexPattern = selectedTimeline.indexNames.length
      ? selectedTimeline.indexNames
      : selectedPatterns;
    const newQuery = {
      query: selectedTimeline.kqlQuery.filterQuery?.kuery?.expression ?? '',
      language: selectedTimeline.kqlQuery.filterQuery?.kuery?.kind ?? 'kuery',
    };
    const dataProvidersDsl =
      selectedTimeline.dataProviders != null && selectedTimeline.dataProviders.length > 0
        ? convertKueryToElasticSearchQuery(
            buildGlobalQuery(selectedTimeline.dataProviders, selectedDataViewBrowserFields),
            { fields: [], title: indexPattern.join(',') }
          )
        : '';

    const newFilters = selectedTimeline.filters ?? [];
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
    if (ogDataView.dataViewId !== dataViewId) {
      dispatch(
        sourcererActions.setSelectedDataView({
          id: SourcererScopeName.timeline,
          selectedDataViewId: ogDataView.dataViewId,
          selectedPatterns: ogDataView.selectedPatterns,
        })
      );
    }
  }, [
    selectedTimeline,
    selectedDataViewBrowserFields,
    selectedPatterns,
    ogDataView.dataViewId,
    ogDataView.selectedPatterns,
    dataViewId,
    dispatch,
  ]);

  useEffect(() => {
    // ensure browser fields are correct before updating the rule
    if (selectedDataViewBrowserFields != null) {
      handleSetRuleFromTimeline();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDataViewBrowserFields]);
  // end set rule

  // start handle set rule from timeline id
  const getInitialUrlParamValue = useGetInitialUrlParamValue<string>(RULE_FROM_TIMELINE_URL_PARAM);
  const { decodedParam: timelineIdFromUrl } = useMemo(getInitialUrlParamValue, [
    getInitialUrlParamValue,
  ]);

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
    if (timelineIdFromUrl != null) {
      getTimelineById(timelineIdFromUrl);
    } else {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timelineIdFromUrl]);
  // end handle set rule from timeline id

  const handleReset = useCallback(() => {
    setRuleData(initialState);
  }, []);

  return { ...ruleData, loading, onOpenTimeline, handleReset };
};
