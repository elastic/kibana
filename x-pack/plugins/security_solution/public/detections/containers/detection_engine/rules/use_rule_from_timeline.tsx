/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEmpty } from 'lodash/fp';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  convertKueryToElasticSearchQuery,
  updateIsLoading as dispatchUpdateIsLoading,
} from '@kbn/timelines-plugin/public';
import { useDispatch } from 'react-redux';
import { EuiLink } from '@elastic/eui';

import { stepDefineDefaultValue } from '../../../pages/detection_engine/rules/utils';
import type { TimelineModel } from '../../../..';
import type { FieldValueQueryBar } from '../../../components/rules/query_bar';
import { getTimelineUrl, useFormatUrl } from '../../../../common/components/link_to';
import { SecurityPageName } from '../../../../../common/constants';
import { useAppToasts } from '../../../../common/hooks/use_app_toasts';
import { sourcererActions } from '../../../../common/store/sourcerer';
import { sourcererSelectors } from '../../../../common/store';
import { useDeepEqualSelector } from '../../../../common/hooks/use_selector';
import {
  dispatchUpdateTimeline,
  queryTimelineById,
} from '../../../../timelines/components/open_timeline/helpers';
import { useGetInitialUrlParamValue } from '../../../../common/utils/global_query_string/helpers';
import { buildGlobalQuery } from '../../../../timelines/components/timeline/helpers';
import { getDataProviderFilter } from '../../../../timelines/components/timeline/query_bar';
import { SourcererScopeName } from '../../../../common/store/sourcerer/model';
import * as i18n from '../../../../detection_engine/rule_creation_ui/pages/rule_creation/translations';

export const RULE_FROM_TIMELINE_URL_PARAM = 'createRuleFromTimeline';

interface RuleFromTimeline {
  index: string[];
  loading: boolean;
  onOpenTimeline: (timeline: TimelineModel) => void;
  queryBar: FieldValueQueryBar;
  updated: boolean;
}

export const initialState = {
  index: stepDefineDefaultValue.index,
  queryBar: stepDefineDefaultValue.queryBar,
  updated: false,
};

/**
 * When returned property updated === true,
 * the index and queryBar properties have been updated from timeline data
 * queried either from id in the url param or by passing a timeline to returned callback onOpenTimeline
 */
export const useRuleFromTimeline = (): RuleFromTimeline => {
  const dispatch = useDispatch();
  const toasts = useAppToasts();

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

      // let sourcerer manage the selected browser fields by setting timeline scope to the selected timeline data view
      // sourcerer handles the logic of if the fields have been fetched or need to be fetched
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
  // end RuleFromTimeline definition

  // start browser field management
  const sourcererScopeSelector = useMemo(() => sourcererSelectors.getSourcererScopeSelector(), []);
  const { selectedDataView, sourcererScope } = useDeepEqualSelector((state) =>
    sourcererScopeSelector(state, SourcererScopeName.timeline)
  );
  const [ogDataView] = useState({ selectedDataView, sourcererScope });

  const selectedDataViewBrowserFields = useMemo(() => {
    if (selectedDataView == null) {
      // the timeline data view is deleted, user must fix timeline to use with rule
      setLoading(false);
      setIsError(true);

      return null;
    }

    if (
      selectedTimeline == null ||
      selectedTimeline.dataViewId == null ||
      selectedDataView.id !== selectedTimeline.dataViewId
    ) {
      return null;
    }

    if (isEmpty(selectedDataView.browserFields)) {
      return null;
    }

    return selectedDataView.browserFields;
  }, [selectedDataView, selectedTimeline]);
  // end browser field management

  // start set rule
  const handleSetRuleFromTimeline = useCallback(() => {
    if (
      selectedTimeline == null ||
      selectedDataView == null ||
      selectedDataViewBrowserFields == null
    )
      return;
    const indexPattern = selectedTimeline.indexNames.length
      ? selectedTimeline.indexNames
      : selectedDataView.patternList;
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
  }, [selectedTimeline, selectedDataView, selectedDataViewBrowserFields, ogDataView, dispatch]);

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

  // start handle error
  const { formatUrl } = useFormatUrl(SecurityPageName.timelines);
  const getTimelineLink = useCallback(
    (id: string) =>
      formatUrl(getTimelineUrl(id), {
        absolute: true,
        skipSearch: true,
      }),
    [formatUrl]
  );

  const [isError, setIsError] = useState(false);

  const addError = useCallback(
    () =>
      toasts.addError(
        `${i18n.RULE_FROM_TIMELINE_ERROR_TITLE}, ${i18n.RULE_FROM_TIMELINE_ERROR_ACTION}`,
        {
          title: i18n.RULE_FROM_TIMELINE_ERROR_TITLE,
          toastMessage: (
            <>
              <FormattedMessage
                id="xpack.securitySolution.detectionEngine.createRule.selectedTimelineErrorToast"
                defaultMessage="There is an issue with the data view used with this saved timeline. To create a rule from this timeline, you must {link}."
                values={{
                  link: timelineIdFromUrl ? (
                    <EuiLink href={getTimelineLink(timelineIdFromUrl)}>
                      {i18n.RULE_FROM_TIMELINE_ERROR_ACTION}
                    </EuiLink>
                  ) : (
                    i18n.RULE_FROM_TIMELINE_ERROR_ACTION
                  ),
                }}
              />
            </>
          ) as unknown as string,
        }
      ),
    [getTimelineLink, timelineIdFromUrl, toasts]
  );

  useEffect(() => {
    if (isError) {
      addError();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isError]);
  // end handle error

  return { ...ruleData, loading, onOpenTimeline };
};
