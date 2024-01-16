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
import { getDatasetQualitTableColumns } from '../components/dataset_quality/columns';
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
  const [sortField, setSortField] = useState<SORT_FIELD>(DEFAULT_SORT_FIELD);
  const [sortDirection, setSortDirection] = useState<DIRECTION>(DEFAULT_SORT_DIRECTION);

  const defaultTimeRange = getDefaultTimeRange();

  const { dataStreamsStatsServiceClient: client, store } = useDatasetQualityContext();

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
    () => getDatasetQualitTableColumns({ fieldFormats, loadingDegradedStats }),
    [fieldFormats, loadingDegradedStats]
  );

  const pagination = {
    pageIndex: store.state.table.page,
    pageSize: store.state.table.rowsPerPage,
    totalItemCount: data.length,
    hidePerPageOptions: true,
  };

  const onTableChange = useCallback(
    (options: {
      page: { index: number; size: number };
      sort?: { field: SORT_FIELD; direction: DIRECTION };
    }) => {
      store.actions.setPage(options.page.index);
      store.actions.setRowsPerPage(options.page.size);
      setSortField(options.sort?.field || DEFAULT_SORT_FIELD);
      setSortDirection(options.sort?.direction || DEFAULT_SORT_DIRECTION);
    },
    [store.actions]
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

    return sortedItems.slice(
      store.state.table.page * store.state.table.rowsPerPage,
      (store.state.table.page + 1) * store.state.table.rowsPerPage
    );
  }, [
    sortField,
    data,
    sortDirection,
    store.state.table.page,
    store.state.table.rowsPerPage,
    degradedStats,
  ]);

  const resultsCount = useMemo(() => {
    const startNumberItemsOnPage =
      store.state.table.rowsPerPage * store.state.table.page + (renderedItems.length ? 1 : 0);
    const endNumberItemsOnPage =
      store.state.table.rowsPerPage * store.state.table.page + renderedItems.length;

    return store.state.table.rowsPerPage === 0 ? (
      <strong>{tableSummaryAllText}</strong>
    ) : (
      <>
        <strong>
          {startNumberItemsOnPage}-{endNumberItemsOnPage}
        </strong>{' '}
        {tableSummaryOfText} {data.length}
      </>
    );
  }, [data.length, store.state.table.page, store.state.table.rowsPerPage, renderedItems.length]);

  return {
    sort,
    onTableChange,
    pagination,
    renderedItems,
    columns,
    loading,
    resultsCount,
  };
};
