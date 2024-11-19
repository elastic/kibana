/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEmpty } from 'lodash/fp';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useDispatch } from 'react-redux';
import { i18n } from '@kbn/i18n';
import type { EqlOptions } from '@kbn/timelines-plugin/common';
import { convertKueryToElasticSearchQuery } from '../../../../common/lib/kuery';
import { useAppToasts } from '../../../../common/hooks/use_app_toasts';
import { useSourcererDataView } from '../../../../sourcerer/containers';
import type { TimelineModel } from '../../../..';
import type { FieldValueQueryBar } from '../../../../detection_engine/rule_creation_ui/components/query_field';
import { sourcererActions } from '../../../../sourcerer/store';
import { useQueryTimelineById } from '../../../../timelines/components/open_timeline/helpers';
import { useGetInitialUrlParamValue } from '../../../../common/utils/global_query_string/helpers';
import { buildGlobalQuery } from '../../../../timelines/components/timeline/helpers';
import { getDataProviderFilter } from '../../../../timelines/components/timeline/query_bar';
import { SourcererScopeName } from '../../../../sourcerer/store/model';

export const RULE_FROM_TIMELINE_URL_PARAM = 'createRuleFromTimeline';
export const RULE_FROM_EQL_URL_PARAM = 'createRuleFromEql';

export interface RuleFromTimeline {
  loading: boolean;
  onOpenTimeline: (timeline: TimelineModel) => void;
}

export type SetRuleQuery = ({
  index,
  queryBar,
  eqlOptions,
}: {
  index: string[];
  queryBar: FieldValueQueryBar;
  eqlOptions?: EqlOptions;
}) => void;

export const useRuleFromTimeline = (setRuleQuery: SetRuleQuery): RuleFromTimeline => {
  const dispatch = useDispatch();
  const { addError } = useAppToasts();
  const { browserFields, dataViewId, selectedPatterns } = useSourcererDataView(
    SourcererScopeName.timeline
  );

  const isEql = useRef(false);

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

  const getInitialUrlParamValue = useGetInitialUrlParamValue<string>(RULE_FROM_TIMELINE_URL_PARAM);
  const timelineIdFromUrl = useMemo(getInitialUrlParamValue, [getInitialUrlParamValue]);
  const getInitialUrlParamValueEql = useGetInitialUrlParamValue<string>(RULE_FROM_EQL_URL_PARAM);
  const timelineIdFromUrlEql = useMemo(getInitialUrlParamValueEql, [getInitialUrlParamValueEql]);

  // start set rule
  const handleSetRuleFromTimeline = useCallback(() => {
    if (selectedTimeline == null || selectedDataViewBrowserFields == null) return;

    try {
      const queryRuleFromTimeline = () => ({
        dataProviders:
          selectedTimeline.dataProviders != null && selectedTimeline.dataProviders.length > 0
            ? convertKueryToElasticSearchQuery(
                buildGlobalQuery(selectedTimeline.dataProviders, selectedDataViewBrowserFields),
                { fields: [], title: selectedPatterns.join(',') }
              )
            : '',
        query: {
          query: selectedTimeline.kqlQuery.filterQuery?.kuery?.expression ?? '',
          language: selectedTimeline.kqlQuery.filterQuery?.kuery?.kind ?? 'kuery',
        },
        filters: selectedTimeline.filters ?? [],
        eqlOptions: {},
      });
      const eqlRuleFromTimeline = () => ({
        dataProviders: '',
        query: {
          query: selectedTimeline.eqlOptions.query ?? '',
          language: 'eql',
        },
        filters: [],
        eqlOptions: { eqlOptions: selectedTimeline.eqlOptions },
      });
      const data = isEql.current ? eqlRuleFromTimeline() : queryRuleFromTimeline();

      setLoading(false);
      setRuleQuery({
        index: selectedPatterns,
        queryBar: {
          filters:
            data.dataProviders !== ''
              ? [...data.filters, getDataProviderFilter(data.dataProviders)]
              : data.filters,
          query: data.query,
          saved_id: null,
        },
        ...data.eqlOptions,
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

    // reset and default to query since this is the only query type the user can set after url has been initialized
    isEql.current = false;
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

  const queryTimelineById = useQueryTimelineById();

  const getTimelineById = useCallback(
    (timelineId: string) => {
      if (selectedTimeline == null || timelineId !== selectedTimeline.id) {
        queryTimelineById({
          timelineId,
          onOpenTimeline,
        });
      }
    },
    [onOpenTimeline, queryTimelineById, selectedTimeline]
  );

  const [urlStateInitialized, setUrlStateInitialized] = useState(false);

  useEffect(() => {
    if (!urlStateInitialized) {
      let id: string | null = null;
      if (timelineIdFromUrl != null) {
        id = timelineIdFromUrl;
      } else if (timelineIdFromUrlEql != null) {
        id = timelineIdFromUrlEql;
        isEql.current = true;
      }

      if (id != null) {
        setUrlStateInitialized(true);
        getTimelineById(id);
        setLoading(true);
      }
    }
  }, [getTimelineById, timelineIdFromUrl, timelineIdFromUrlEql, urlStateInitialized]);
  // end handle set rule from timeline id

  return { loading, onOpenTimeline };
};
