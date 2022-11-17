/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEmpty } from 'lodash/fp';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  convertKueryToElasticSearchQuery,
  updateIsLoading as dispatchUpdateIsLoading,
} from '@kbn/timelines-plugin/public';
import { useDispatch } from 'react-redux';
import { EuiLink } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { getTimelineUrl, useFormatUrl } from '../../../../../common/components/link_to';
import { SecurityPageName } from '../../../../../../common/constants';
import { useAppToasts } from '../../../../../common/hooks/use_app_toasts';
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
import * as i18n from './translations';

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
  const toasts = useAppToasts();
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
  const { formatUrl } = useFormatUrl(SecurityPageName.timelines);
  const getTimelineLink = useCallback(
    (id: string) =>
      formatUrl(getTimelineUrl(id), {
        absolute: true,
        skipSearch: true,
      }),
    [formatUrl]
  );
  const selectedDataViewBrowserFields = useMemo(() => {
    if (selectedDataView == null) {
      // the timeline data view is deleted, user must fix timeline to use with rule
      setLoading(false);
      toasts.addError('whoops', {
        title: i18n.FROM_TIMELINE_ERROR_TITLE,
        toastMessage: (
          <>
            <FormattedMessage
              id="xpack.securitySolution.detectionEngine.createRule.fromTimelineErrorToast"
              defaultMessage="There is an issue with the data view used with this saved timeline. To create a rule from this timeline, you must {link}."
              values={{
                link: fromTimelineId ? (
                  <EuiLink href={getTimelineLink(fromTimelineId)}>
                    {i18n.FROM_TIMELINE_ERROR_ACTION}
                  </EuiLink>
                ) : (
                  i18n.FROM_TIMELINE_ERROR_ACTION
                ),
              }}
            />
          </>
        ) as unknown as string,
      });
      return null;
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
  }, [selectedDataView, fromTimeline, toasts, fromTimelineId, getTimelineLink]);

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
