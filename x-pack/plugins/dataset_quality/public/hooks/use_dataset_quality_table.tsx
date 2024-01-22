/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useSelector } from '@xstate/react';
import { find, orderBy } from 'lodash';
import React, { useCallback, useMemo, useState } from 'react';
import { DataStreamStat } from '../../common/data_streams_stats/data_stream_stat';
import { tableSummaryAllText, tableSummaryOfText } from '../../common/translations';
import { getDatasetQualitTableColumns } from '../components/dataset_quality/columns';
import { useDatasetQualityContext } from '../components/dataset_quality/context';
import { useKibanaContextForPlugin } from '../utils';

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

  const { service } = useDatasetQualityContext();

  const { page, rowsPerPage } = useSelector(service, (state) => state.context.table);
  const dataStreamStats = useSelector(service, (state) => state.context.dataStreamStats);
  const loading = useSelector(service, (state) => state.matches('loadingDatasets'));
  const degradedStats = useSelector(service, (state) => state.context.degradedDocStats);
  const loadingDegradedStats = useSelector(service, (state) =>
    state.matches('loadingDegradedDocs')
  );

  // const { data = [], loading } = useFetcher(async () => client.getDataStreamsStats(), []);
  /* const { data: degradedStats = [], loading: loadingDegradedStats } = useFetcher(
    async () =>
      client.getDataStreamsDegradedStats({
        start: defaultTimeRange.from,
        end: defaultTimeRange.to,
      }),
    []
  ); */

  const columns = useMemo(
    () => getDatasetQualitTableColumns({ fieldFormats, loadingDegradedStats }),
    [fieldFormats, loadingDegradedStats]
  );

  const pagination = {
    pageIndex: page,
    pageSize: rowsPerPage,
    totalItemCount: dataStreamStats.length,
    hidePerPageOptions: true,
  };

  const onTableChange = useCallback(
    (options: {
      page: { index: number; size: number };
      sort?: { field: SORT_FIELD; direction: DIRECTION };
    }) => {
      service.send({
        type: 'CHANGE_PAGE',
        page: options.page.index,
      });
      service.send({
        type: 'CHANGE_ROWS_PER_PAGE',
        rowsPerPage: options.page.size,
      });
      setSortField(options.sort?.field || DEFAULT_SORT_FIELD);
      setSortDirection(options.sort?.direction || DEFAULT_SORT_DIRECTION);
    },
    [service]
  );

  const sort = {
    sort: { field: sortField, direction: sortDirection },
  };

  const renderedItems = useMemo(() => {
    const overridenSortingField = sortingOverrides[sortField] || sortField;
    const mergedData = dataStreamStats.map((dataStream) => {
      const degradedDocs = find(degradedStats, { dataset: dataStream.rawName });

      return {
        ...dataStream,
        degradedDocs: degradedDocs?.percentage,
      };
    });

    const sortedItems = orderBy(mergedData, overridenSortingField, sortDirection);

    return sortedItems.slice(page * rowsPerPage, (page + 1) * rowsPerPage);
  }, [sortField, dataStreamStats, sortDirection, page, rowsPerPage, degradedStats]);

  const resultsCount = useMemo(() => {
    const startNumberItemsOnPage = rowsPerPage ?? 1 * page ?? 0 + (renderedItems.length ? 1 : 0);
    const endNumberItemsOnPage = rowsPerPage * page + renderedItems.length;

    return rowsPerPage === 0 ? (
      <strong>{tableSummaryAllText}</strong>
    ) : (
      <>
        <strong>
          {startNumberItemsOnPage}-{endNumberItemsOnPage}
        </strong>{' '}
        {tableSummaryOfText} {dataStreamStats.length}
      </>
    );
  }, [dataStreamStats.length, renderedItems.length, page, rowsPerPage]);

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
