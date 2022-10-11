/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  convertKueryToElasticSearchQuery,
  updateIsLoading as dispatchUpdateIsLoading,
} from '@kbn/timelines-plugin/public';
import { useDispatch } from 'react-redux';
import type { TimelineModel } from '../../../../..';
import {
  dispatchUpdateTimeline,
  queryTimelineById,
} from '../../../../../timelines/components/open_timeline/helpers';
import type { FieldValueQueryBar } from '../../../../components/rules/query_bar';
import { useGetInitialUrlParamValue } from '../../../../../common/utils/global_query_string/helpers';
import { buildGlobalQuery } from '../../../../../timelines/components/timeline/helpers';
import { getDataProviderFilter } from '../../../../../timelines/components/timeline/query_bar';
import { useSourcererDataView } from '../../../../../common/containers/sourcerer';
import { SourcererScopeName } from '../../../../../common/store/sourcerer/model';

export const FROM_TIMELINE_ID_URL_PARAM = 'createRuleFromTimelineId';

export const useFromTimelineId = (initialState: {
  index: string[];
  queryBar: FieldValueQueryBar;
}) => {
  const getInitialUrlParamValue = useGetInitialUrlParamValue<string>(FROM_TIMELINE_ID_URL_PARAM);

  const { decodedParam: fromTimelineId } = useMemo(
    () => getInitialUrlParamValue(),
    [getInitialUrlParamValue]
  );

  const [ruleData, setRuleData] = useState<{
    index: string[];
    queryBar: FieldValueQueryBar;
    updated: boolean;
  }>({
    ...initialState,
    updated: false,
  });
  const { browserFields } = useSourcererDataView(SourcererScopeName.default);

  const dispatch = useDispatch();
  const onOpenTimeline = useCallback(
    (timeline: TimelineModel) => {
      const indexPattern = timeline.indexNames;
      const newQuery = {
        query: timeline.kqlQuery.filterQuery?.kuery?.expression ?? '',
        language: timeline.kqlQuery.filterQuery?.kuery?.kind ?? 'kuery',
      };
      const dataProvidersDsl =
        timeline.dataProviders != null && timeline.dataProviders.length > 0
          ? convertKueryToElasticSearchQuery(
          ? // empty browserFields/fields arguments because they are not part of the final query anyways
            convertKueryToElasticSearchQuery(buildGlobalQuery(timeline.dataProviders, {}), {
              fields: [],
              title: indexPattern.join(','),
            })
          : '';

      const newFilters = timeline.filters ?? [];

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
    },
    [browserFields]
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
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fromTimelineId]);

  return ruleData;
};
