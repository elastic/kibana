/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useFetcher } from '@kbn/observability-shared-plugin/public';
import { find, orderBy } from 'lodash';
import React, { useCallback, useMemo, useState } from 'react';
import { DataStreamStat } from '../../common/data_streams_stats/data_stream_stat';
import { tableSummaryAllText, tableSummaryOfText } from '../../common/translations';
import { getDatasetQualityTableColumns } from '../components/dataset_quality/columns';
import { useDatasetQualityContext } from '../components/dataset_quality/context';
import { getDefaultTimeRange, useKibanaContextForPlugin } from '../utils';

const DEFAULT_SORT_FIELD = 'title';
const DEFAULT_SORT_DIRECTION = 'desc';
type DIRECTION = 'asc' | 'desc';
type SORT_FIELD = keyof DataStreamStat;

const sortingOverrides: Partial<{ [key in SORT_FIELD]: SORT_FIELD }> = {
  ['title']: 'name',
  ['size']: 'sizeBytes',
};

export const useDatasetQualityTable = () => {
  const {
    services: { fieldFormats },
  } = useKibanaContextForPlugin();
  const [selectedDataset, setSelectedDataset] = useState<DataStreamStat>();
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [sortField, setSortField] = useState<SORT_FIELD>(DEFAULT_SORT_FIELD);
  const [sortDirection, setSortDirection] = useState<DIRECTION>(DEFAULT_SORT_DIRECTION);

  const defaultTimeRange = getDefaultTimeRange();

  const { dataStreamsStatsServiceClient: client } = useDatasetQualityContext();
  const { data = [], loading } = useFetcher(async () => client.getDataStreamsStats(), []);
  const { data: degradedStats = [], loading: loadingDegradedStats } = useFetcher(
    async () =>
      client.getDataStreamsDegradedStats({
        start: defaultTimeRange.from,
        end: defaultTimeRange.to,
      }),
    []
  );

  const columns = useMemo(
    () =>
      getDatasetQualityTableColumns({
        fieldFormats,
        selectedDataset,
        setSelectedDataset,
        loadingDegradedStats,
      }),
    [fieldFormats, loadingDegradedStats, selectedDataset, setSelectedDataset]
  );

  const pagination = {
    pageIndex,
    pageSize,
    totalItemCount: data.length,
    hidePerPageOptions: true,
  };

  const onTableChange = useCallback(
    (options: {
      page: { index: number; size: number };
      sort?: { field: SORT_FIELD; direction: DIRECTION };
    }) => {
      setPageIndex(options.page.index);
      setPageSize(options.page.size);
      setSortField(options.sort?.field || DEFAULT_SORT_FIELD);
      setSortDirection(options.sort?.direction || DEFAULT_SORT_DIRECTION);
    },
    []
  );

  const sort = {
    sort: { field: sortField, direction: sortDirection },
  };

  const renderedItems = useMemo(() => {
    const overridenSortingField = sortingOverrides[sortField] || sortField;
    const mergedData = data.map((dataStream) => {
      const degradedDocs = find(degradedStats, { dataset: dataStream.rawName });

      return {
        ...dataStream,
        degradedDocs: degradedDocs?.percentage,
      };
    });

    const sortedItems = orderBy(mergedData, overridenSortingField, sortDirection);

    return sortedItems.slice(pageIndex * pageSize, (pageIndex + 1) * pageSize);
  }, [data, degradedStats, sortField, sortDirection, pageIndex, pageSize]);

  const resultsCount = useMemo(() => {
    const startNumberItemsOnPage = pageSize * pageIndex + (renderedItems.length ? 1 : 0);
    const endNumberItemsOnPage = pageSize * pageIndex + renderedItems.length;

    return pageSize === 0 ? (
      <strong>{tableSummaryAllText}</strong>
    ) : (
      <>
        <strong>
          {startNumberItemsOnPage}-{endNumberItemsOnPage}
        </strong>{' '}
        {tableSummaryOfText} {data.length}
      </>
    );
  }, [data.length, pageIndex, pageSize, renderedItems.length]);

  const closeFlyout = useCallback(() => setSelectedDataset(undefined), []);

  return {
    sort,
    onTableChange,
    pagination,
    renderedItems,
    columns,
    loading,
    resultsCount,
    closeFlyout,
    selectedDataset,
  };
};
