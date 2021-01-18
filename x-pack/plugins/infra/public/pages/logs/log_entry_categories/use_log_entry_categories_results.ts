/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useMemo, useState } from 'react';

import {
  GetLogEntryCategoriesSuccessResponsePayload,
  GetLogEntryCategoryDatasetsSuccessResponsePayload,
  CategorySort,
} from '../../../../common/http_api/log_analysis';
import { useTrackedPromise, CanceledPromiseError } from '../../../utils/use_tracked_promise';
import { callGetTopLogEntryCategoriesAPI } from './service_calls/get_top_log_entry_categories';
import { callGetLogEntryCategoryDatasetsAPI } from './service_calls/get_log_entry_category_datasets';
import { useKibanaContextForPlugin } from '../../../hooks/use_kibana';

type TopLogEntryCategories = GetLogEntryCategoriesSuccessResponsePayload['data']['categories'];
type LogEntryCategoryDatasets = GetLogEntryCategoryDatasetsSuccessResponsePayload['data']['datasets'];

export type SortOptions = CategorySort;
export type ChangeSortOptions = (sortOptions: CategorySort) => void;

export const useLogEntryCategoriesResults = ({
  categoriesCount,
  filteredDatasets: filteredDatasets,
  endTime,
  onGetLogEntryCategoryDatasetsError,
  onGetTopLogEntryCategoriesError,
  sourceId,
  startTime,
}: {
  categoriesCount: number;
  filteredDatasets: string[];
  endTime: number;
  onGetLogEntryCategoryDatasetsError?: (error: Error) => void;
  onGetTopLogEntryCategoriesError?: (error: Error) => void;
  sourceId: string;
  startTime: number;
}) => {
  const [sortOptions, setSortOptions] = useState<SortOptions>({
    field: 'maximumAnomalyScore',
    direction: 'desc',
  });
  const { services } = useKibanaContextForPlugin();
  const [topLogEntryCategories, setTopLogEntryCategories] = useState<TopLogEntryCategories>([]);
  const [
    logEntryCategoryDatasets,
    setLogEntryCategoryDatasets,
  ] = useState<LogEntryCategoryDatasets>([]);

  const [getTopLogEntryCategoriesRequest, getTopLogEntryCategories] = useTrackedPromise(
    {
      cancelPreviousOn: 'creation',
      createPromise: async () => {
        return await callGetTopLogEntryCategoriesAPI(
          {
            sourceId,
            startTime,
            endTime,
            categoryCount: categoriesCount,
            datasets: filteredDatasets,
            sort: sortOptions,
          },
          services.http.fetch
        );
      },
      onResolve: ({ data: { categories } }) => {
        setTopLogEntryCategories(categories);
      },
      onReject: (error) => {
        if (
          error instanceof Error &&
          !(error instanceof CanceledPromiseError) &&
          onGetTopLogEntryCategoriesError
        ) {
          onGetTopLogEntryCategoriesError(error);
        }
      },
    },
    [categoriesCount, endTime, filteredDatasets, sourceId, startTime, sortOptions]
  );

  const [getLogEntryCategoryDatasetsRequest, getLogEntryCategoryDatasets] = useTrackedPromise(
    {
      cancelPreviousOn: 'creation',
      createPromise: async () => {
        return await callGetLogEntryCategoryDatasetsAPI(
          { sourceId, startTime, endTime },
          services.http.fetch
        );
      },
      onResolve: ({ data: { datasets } }) => {
        setLogEntryCategoryDatasets(datasets);
      },
      onReject: (error) => {
        if (
          error instanceof Error &&
          !(error instanceof CanceledPromiseError) &&
          onGetLogEntryCategoryDatasetsError
        ) {
          onGetLogEntryCategoryDatasetsError(error);
        }
      },
    },
    [categoriesCount, endTime, sourceId, startTime]
  );

  const isLoadingTopLogEntryCategories = useMemo(
    () => getTopLogEntryCategoriesRequest.state === 'pending',
    [getTopLogEntryCategoriesRequest.state]
  );

  const isLoadingLogEntryCategoryDatasets = useMemo(
    () => getLogEntryCategoryDatasetsRequest.state === 'pending',
    [getLogEntryCategoryDatasetsRequest.state]
  );

  const isLoading = useMemo(
    () => isLoadingTopLogEntryCategories || isLoadingLogEntryCategoryDatasets,
    [isLoadingLogEntryCategoryDatasets, isLoadingTopLogEntryCategories]
  );

  return {
    getLogEntryCategoryDatasets,
    getTopLogEntryCategories,
    isLoading,
    isLoadingLogEntryCategoryDatasets,
    isLoadingTopLogEntryCategories,
    logEntryCategoryDatasets,
    topLogEntryCategories,
    sortOptions,
    changeSortOptions: setSortOptions,
  };
};
