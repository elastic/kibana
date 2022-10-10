/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { getOr } from 'lodash/fp';
import { convertKueryToElasticSearchQuery } from '@kbn/timelines-plugin/public';
import type { FieldValueQueryBar } from '../../../../components/rules/query_bar';
import { useGetInitialUrlParamValue } from '../../../../../common/utils/global_query_string/helpers';
import { REQUEST_NAMES, useFetch } from '../../../../../common/hooks/use_fetch';
import { getTimeline } from '../../../../../timelines/containers/api';
import { buildGlobalQuery } from '../../../../../timelines/components/timeline/helpers';
import { getDataProviderFilter } from '../../../../../timelines/components/timeline/query_bar';
import { useSourcererDataView } from '../../../../../common/containers/sourcerer';
import { SourcererScopeName } from '../../../../../common/store/sourcerer/model';

export const useFromTimelineId = (initialState: {
  index: string[];
  queryBar: FieldValueQueryBar;
}) => {
  const getInitialUrlParamValue = useGetInitialUrlParamValue<string>('createRuleFromTimelineId');

  const { decodedParam: fromTimelineId } = useMemo(
    () => getInitialUrlParamValue(),
    [getInitialUrlParamValue]
  );
  const { fetch, data: timelineData } = useFetch(REQUEST_NAMES.GET_TIMELINE_BY_ID, getTimeline);
  const [ruleData, setRuleData] = useState<{
    index: string[];
    queryBar: FieldValueQueryBar;
    updated: boolean;
  }>({
    ...initialState,
    updated: false,
  });
  const { browserFields } = useSourcererDataView(SourcererScopeName.default);

  useEffect(() => {
    if (timelineData != null) {
      const indexPattern = getOr([], 'data.getOneTimeline.indexNames', timelineData);
      const dataProviders = getOr([], 'data.getOneTimeline.dataProviders', timelineData);
      const kqlQuery = getOr({}, 'data.getOneTimeline.kqlQuery', timelineData);
      const filters = getOr([], 'data.getOneTimeline.filters', timelineData);
      const newQuery = {
        query: kqlQuery?.filterQuery?.kuery?.expression ?? '',
        language: kqlQuery?.filterQuery?.kuery?.kind ?? 'kuery',
      };

      const dataProvidersDsl =
        dataProviders.length > 0
          ? convertKueryToElasticSearchQuery(
              buildGlobalQuery(dataProviders, browserFields),
              indexPattern.join(',')
            )
          : '';
      setRuleData({
        index: indexPattern,
        queryBar: {
          filters:
            dataProvidersDsl !== ''
              ? [...filters, getDataProviderFilter(dataProvidersDsl)]
              : filters,
          query: newQuery,
          saved_id: null,
        },
        updated: true,
      });
    }
  }, [browserFields, timelineData]);

  const getTimelineById = useCallback(
    (savedObjectId: string) => {
      fetch(savedObjectId);
    },
    [fetch]
  );

  useEffect(() => {
    if (fromTimelineId != null) {
      getTimelineById(fromTimelineId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fromTimelineId]);

  return ruleData;
};
