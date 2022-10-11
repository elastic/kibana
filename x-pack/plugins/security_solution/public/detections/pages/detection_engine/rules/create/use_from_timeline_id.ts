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
import { useDataView } from '../../../../../common/containers/source/use_data_view';
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

export const FROM_TIMELINE_ID_URL_PARAM = 'createRuleFromTimelineId';

const isEmptyObject = (obj: { [key: string]: unknown }) => {
  for (const prop in obj) {
    // return false no matter what
    // if we made it inside the for loop which proves the object is not empty
    // the "if" check is for typescript
    if (prop) {
      return false;
    } else {
      return false;
    }
  }
  return true;
};

export const useFromTimelineId = (initialState: {
  index: string[];
  queryBar: FieldValueQueryBar;
}) => {
  const getInitialUrlParamValue = useGetInitialUrlParamValue<string>(FROM_TIMELINE_ID_URL_PARAM);

  const { decodedParam: fromTimelineId } = useMemo(
    () => getInitialUrlParamValue(),
    [getInitialUrlParamValue]
  );
  const [loading, setLoading] = useState(true);

  const [ruleData, setRuleData] = useState<{
    index: string[];
    queryBar: FieldValueQueryBar;
    updated: boolean;
  }>({
    ...initialState,
    updated: false,
  });

  const dispatch = useDispatch();
  const { indexFieldsSearch } = useDataView();

  const kibanaDataViewSelector = useMemo(() => sourcererSelectors.kibanaDataViewsSelector(), []);
  const kibanaDataViews = useDeepEqualSelector(kibanaDataViewSelector);

  const [timeline, setTimeline] = useState<TimelineModel | null>(null);

  const selectedDataViewBrowserFields = useMemo(() => {
    if (timeline == null || timeline.dataViewId == null) {
      return null;
    }

    const dataView = kibanaDataViews.find((dv) => dv.id === timeline.dataViewId);
    if (dataView == null) {
      throw Error('timeline data view has been deleted, update timeline to fix this error');
    }

    if (isEmptyObject(dataView.browserFields)) {
      indexFieldsSearch({ dataViewId: timeline.dataViewId });
      return null;
    }

    return dataView.browserFields;
  }, [indexFieldsSearch, kibanaDataViews, timeline]);

  useEffect(() => {
    if (selectedDataViewBrowserFields != null) setTheState();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDataViewBrowserFields]);

  const setTheState = useCallback(() => {
    if (timeline == null || selectedDataViewBrowserFields == null) return;
    const indexPattern = timeline.indexNames;
    const newQuery = {
      query: timeline.kqlQuery.filterQuery?.kuery?.expression ?? '',
      language: timeline.kqlQuery.filterQuery?.kuery?.kind ?? 'kuery',
    };
    const dataProvidersDsl =
      timeline.dataProviders != null && timeline.dataProviders.length > 0
        ? convertKueryToElasticSearchQuery(
            buildGlobalQuery(timeline.dataProviders, selectedDataViewBrowserFields),
            { fields: [], title: indexPattern.join(',') }
          )
        : '';

    const newFilters = timeline.filters ?? [];
    // if something goes wrong and we don't hit this
    // the create new rule page will be unusable
    // probably  need to add some sort of timer and in case we don't hit it we show error???
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
  }, [selectedDataViewBrowserFields, timeline]);

  const getTimelineById = useCallback(
    (timelineId: string) =>
      queryTimelineById({
        timelineId,
        onOpenTimeline: setTimeline,
        updateIsLoading: ({
          id: currentTimelineId,
          isLoading,
        }: {
          id: string;
          isLoading: boolean;
        }) => dispatch(dispatchUpdateIsLoading({ id: currentTimelineId, isLoading })),
        updateTimeline: dispatchUpdateTimeline(dispatch),
      }),
    [dispatch]
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
