/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useMemo } from 'react';
import { isEmpty } from 'lodash';

import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { HttpSetup } from '@kbn/core/public';
import { BASE_RAC_ALERTS_API_PATH } from '@kbn/rule-registry-plugin/common/constants';
import { useDataFetcher } from './use_data_fetcher';

export const useFetchAlertData = (alertIds: string[]): [boolean, Record<string, unknown>] => {
  const validIds = useMemo(() => getValidValues(alertIds), [alertIds]);
  const shouldExecuteApiCall = useCallback((ids: string[]) => ids.length > 0, []);

  const { loading, data: alerts } = useDataFetcher<string[], Record<string, unknown> | undefined>({
    paramsForApiCall: validIds,
    initialDataState: undefined,
    executeApiCall: fetchAlerts,
    shouldExecuteApiCall,
  });

  return [loading, alerts ?? {}];
};

const fetchAlerts = async (
  ids: string[],
  abortCtrl: AbortController,
  http: HttpSetup
): Promise<Record<string, unknown> | undefined> => {
  try {
    const response = await http.post<estypes.SearchResponse<Record<string, unknown>>>(
      `${BASE_RAC_ALERTS_API_PATH}/find`,
      {
        body: JSON.stringify({
          query: {
            ids: {
              values: ids,
            },
          },
          track_total_hits: false,
          size: 10000,
        }),
        signal: abortCtrl.signal,
      }
    );

    if (response) {
      return getAlertsGroupedById(response);
    }
  } catch (error) {
    // ignore the failure
  }
};

const getAlertsGroupedById = (
  data: estypes.SearchResponse<Record<string, unknown>>
): Record<string, unknown> => {
  return data.hits.hits.reduce(
    (acc, { _id, _index, _source }) => ({
      ...acc,
      [_id]: {
        _id,
        _index,
        ..._source,
      },
    }),
    {}
  );
};

const getValidValues = (ids: string[]): string[] => {
  return ids.filter((id) => !isEmpty(id));
};
