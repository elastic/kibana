/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo, useState } from 'react';

import { PersistedLogViewReference } from '@kbn/logs-shared-plugin/common';
import { IdFormat } from '../../../../common/http_api/latest';
import {
  GetLogEntryCategoriesSuccessResponsePayload,
  GetLogEntryCategoryDatasetsSuccessResponsePayload,
} from '../../../../common/http_api';
import { CategoriesSort } from '../../../../common/log_analysis';
import { useTrackedPromise, CanceledPromiseError } from '../../../hooks/use_tracked_promise';
import { callGetTopLogEntryCategoriesAPI } from './service_calls/get_top_log_entry_categories';
import { callGetLogEntryCategoryDatasetsAPI } from './service_calls/get_log_entry_category_datasets';
import { useKibanaContextForPlugin } from '../../../hooks/use_kibana';

type TopLogEntryCategories = GetLogEntryCategoriesSuccessResponsePayload['data']['categories'];
type LogEntryCategoryDatasets =
  GetLogEntryCategoryDatasetsSuccessResponsePayload['data']['datasets'];

export type SortOptions = CategoriesSort;
export type ChangeSortOptions = (sortOptions: CategoriesSort) => void;

export const useLogEntryCategoriesResults = ({
  categoriesCount,
  filteredDatasets: filteredDatasets,
  endTime,
  onGetLogEntryCategoryDatasetsError,
  onGetTopLogEntryCategoriesError,
  logViewReference,
  idFormat,
  startTime,
}: {
  categoriesCount: number;
  filteredDatasets: string[];
  endTime: number;
  onGetLogEntryCategoryDatasetsError?: (error: Error) => void;
  onGetTopLogEntryCategoriesError?: (error: Error) => void;
  logViewReference: PersistedLogViewReference;
  idFormat: IdFormat;
  startTime: number;
}) => {
  const [sortOptions, setSortOptions] = useState<SortOptions>({
    field: 'maximumAnomalyScore',
    direction: 'desc',
  });
  const { services } = useKibanaContextForPlugin();
  const [topLogEntryCategories, setTopLogEntryCategories] = useState<TopLogEntryCategories>([]);
  const [logEntryCategoryDatasets, setLogEntryCategoryDatasets] =
    useState<LogEntryCategoryDatasets>([]);

  const [getTopLogEntryCategoriesRequest, getTopLogEntryCategories] = useTrackedPromise(
    {
      cancelPreviousOn: 'creation',
      createPromise: async () => {
        return await callGetTopLogEntryCategoriesAPI(
          {
            logViewReference,
            idFormat,
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
    [
      categoriesCount,
      endTime,
      filteredDatasets,
      logViewReference.logViewId,
      startTime,
      sortOptions,
      idFormat,
    ]
  );

  const [getLogEntryCategoryDatasetsRequest, getLogEntryCategoryDatasets] = useTrackedPromise(
    {
      cancelPreviousOn: 'creation',
      createPromise: async () => {
        return await callGetLogEntryCategoryDatasetsAPI(
          { logViewReference, idFormat, startTime, endTime },
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
    [categoriesCount, endTime, logViewReference.logViewId, idFormat, startTime]
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
