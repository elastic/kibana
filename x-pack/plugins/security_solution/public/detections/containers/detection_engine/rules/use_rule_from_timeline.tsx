/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEmpty } from 'lodash/fp';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useDispatch } from 'react-redux';
import { i18n } from '@kbn/i18n';
import { convertKueryToElasticSearchQuery } from '../../../../common/lib/kuery';
import { updateIsLoading } from '../../../../timelines/store/timeline/actions';
import { useAppToasts } from '../../../../common/hooks/use_app_toasts';
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

export interface RuleFromTimeline {
  loading: boolean;
  onOpenTimeline: (timeline: TimelineModel) => void;
}

export const initialState = {
  index: [],
  queryBar: {
    query: { query: '', language: 'kuery' },
    filters: [],
    saved_id: null,
  },
};

type SetRuleQuery = ({
  index,
  queryBar,
}: {
  index: string[];
  queryBar: FieldValueQueryBar;
}) => void;

/**
 * When returned property updated === true,
 * the index and queryBar properties have been updated from timeline data
 * queried either from id in the url param or by passing a timeline to returned callback onOpenTimeline
 */
export const useRuleFromTimeline = (setRuleQuery: SetRuleQuery): RuleFromTimeline => {
  const dispatch = useDispatch();
  const { addError } = useAppToasts();
  const { browserFields, dataViewId, selectedPatterns } = useSourcererDataView(
    SourcererScopeName.timeline
  );

  // selectedTimeline = timeline to set rule from
  const [selectedTimeline, setRuleFromTimeline] = useState<TimelineModel | null>(null);

  const [loading, setLoading] = useState(false);

  const onOpenTimeline = useCallback(
    (timeline: TimelineModel) => {
      // will already be true if timeline set from url
      setLoading(true);
      setRuleFromTimeline(timeline);

      if (timeline.dataViewId !== dataViewId && !isEmpty(timeline.indexNames)) {
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
    [dataViewId, dispatch]
  );

  // start browser field management
  const [originalDataView] = useState({ dataViewId, selectedPatterns });

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

    const newQuery = {
      query: selectedTimeline.kqlQuery.filterQuery?.kuery?.expression ?? '',
      language: selectedTimeline.kqlQuery.filterQuery?.kuery?.kind ?? 'kuery',
    };
    const newFilters = selectedTimeline.filters ?? [];
    try {
      const dataProvidersDsl =
        selectedTimeline.dataProviders != null && selectedTimeline.dataProviders.length > 0
          ? convertKueryToElasticSearchQuery(
              buildGlobalQuery(selectedTimeline.dataProviders, selectedDataViewBrowserFields),
              { fields: [], title: selectedPatterns.join(',') }
            )
          : '';

      setLoading(false);

      setRuleQuery({
        index: selectedPatterns,
        queryBar: {
          filters:
            dataProvidersDsl !== ''
              ? [...newFilters, getDataProviderFilter(dataProvidersDsl)]
              : newFilters,
          query: newQuery,
          saved_id: null,
        },
      });
    } catch (error) {
      setLoading(false);
      addError(error, {
        toastMessage: i18n.translate('xpack.securitySolution.ruleFromTimeline.error.toastMessage', {
          defaultMessage: 'Failed to create rule from timeline with id: {id}',
          values: {
            id: selectedTimeline.id,
          },
        }),
        title: i18n.translate('xpack.securitySolution.ruleFromTimeline.error.title', {
          defaultMessage: 'Failed to import rule from timeline',
        }),
      });
    }

    // reset timeline data view once complete
    if (originalDataView.dataViewId !== dataViewId) {
      dispatch(
        sourcererActions.setSelectedDataView({
          id: SourcererScopeName.timeline,
          selectedDataViewId: originalDataView.dataViewId,
          selectedPatterns: originalDataView.selectedPatterns,
        })
      );
    }
  }, [
    addError,
    dataViewId,
    dispatch,
    originalDataView.dataViewId,
    originalDataView.selectedPatterns,
    selectedDataViewBrowserFields,
    selectedPatterns,
    selectedTimeline,
    setRuleQuery,
  ]);

  useEffect(() => {
    // ensure browser fields are correct before updating the rule
    if (selectedDataViewBrowserFields != null) {
      handleSetRuleFromTimeline();
    }
  }, [handleSetRuleFromTimeline, selectedDataViewBrowserFields]);
  // end set rule

  // start handle set rule from timeline id
  const getInitialUrlParamValue = useGetInitialUrlParamValue<string>(RULE_FROM_TIMELINE_URL_PARAM);
  const { decodedParam: timelineIdFromUrl } = useMemo(getInitialUrlParamValue, [
    getInitialUrlParamValue,
  ]);

  const getTimelineById = useCallback(
    (timelineId: string) => {
      if (selectedTimeline == null || timelineId !== selectedTimeline.id) {
        queryTimelineById({
          timelineId,
          onOpenTimeline,
          updateIsLoading: ({
            id: currentTimelineId,
            isLoading,
          }: {
            id: string;
            isLoading: boolean;
          }) => dispatch(updateIsLoading({ id: currentTimelineId, isLoading })),
          updateTimeline: dispatchUpdateTimeline(dispatch),
        });
      }
    },
    [dispatch, onOpenTimeline, selectedTimeline]
  );

  const [urlStateInitialized, setUrlStateInitialized] = useState(false);

  useEffect(() => {
    if (timelineIdFromUrl != null && !urlStateInitialized) {
      setUrlStateInitialized(true);
      getTimelineById(timelineIdFromUrl);
      setLoading(true);
    }
  }, [getTimelineById, timelineIdFromUrl, urlStateInitialized]);
  // end handle set rule from timeline id

  return { loading, onOpenTimeline };
};
