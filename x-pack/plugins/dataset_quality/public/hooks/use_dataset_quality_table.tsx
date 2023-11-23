/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { orderBy } from 'lodash';
import React, { useState, useMemo, useCallback } from 'react';
import { useFetcher } from '@kbn/observability-shared-plugin/public';
import { DataStreamStat } from '../../common/data_streams_stats/data_stream_stat';
import { getDatasetQualitTableColumns } from '../components/dataset_quality/columns';
import { useDatasetQualityContext } from '../components/dataset_quality/context';

const DEFAULT_SORT_FIELD = 'title';
const DEFAULT_SORT_DIRECTION = 'desc';
type DIRECTION = 'asc' | 'desc';
type SORT_FIELD = keyof DataStreamStat;

const sortingOverrides: Partial<{ [key in SORT_FIELD]: SORT_FIELD }> = {
  ['size']: 'sizeBytes',
};

export const useDatasetQualityTable = () => {
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [sortField, setSortField] = useState<SORT_FIELD>(DEFAULT_SORT_FIELD);
  const [sortDirection, setSortDirection] = useState<DIRECTION>(DEFAULT_SORT_DIRECTION);

  const { dataStreamsStatsServiceClient: client } = useDatasetQualityContext();
  const { data = [], loading } = useFetcher(async () => client.getDataStreamsStats(), []);

  const columns = useMemo(() => getDatasetQualitTableColumns(), []);

  const pagination = useMemo(
    () => ({
      pageIndex,
      pageSize,
      totalItemCount: data.length,
      hidePerPageOptions: true,
    }),
    [pageIndex, pageSize, data.length]
  );

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

  const sort = useMemo(() => {
    return {
      sort: { field: sortField, direction: sortDirection },
    };
  }, [sortField, sortDirection]);

  const renderedItems = useMemo(() => {
    const overridenSortingField = sortingOverrides[sortField] || sortField;
    const sortedItems = orderBy(data, overridenSortingField, sortDirection);

    return sortedItems.slice(pageIndex * pageSize, (pageIndex + 1) * pageSize);
  }, [data, sortField, sortDirection, pageIndex, pageSize]);

  const resultsCount = useMemo(() => {
    const startNumberItemsOnPage = pageSize * pageIndex + (renderedItems.length ? 1 : 0);
    const endNumberItemsOnPage = pageSize * pageIndex + renderedItems.length;

    return pageSize === 0 ? (
      <strong>All</strong>
    ) : (
      <>
        <strong>
          {startNumberItemsOnPage}-{endNumberItemsOnPage}
        </strong>{' '}
        of {data.length}
      </>
    );
  }, [data.length, pageIndex, pageSize, renderedItems.length]);

  return { sort, onTableChange, pagination, renderedItems, columns, loading, resultsCount };
};
