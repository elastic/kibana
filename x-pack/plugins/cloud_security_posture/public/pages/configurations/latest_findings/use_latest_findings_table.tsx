/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Filter } from '@kbn/es-query';
import { useMemo } from 'react';
import { useDataViewContext } from '../../../common/contexts/data_view_context';
import { FindingsBaseURLQuery } from '../../../common/types';
import { Evaluation } from '../../../../common/types_old';
import { LOCAL_STORAGE_DATA_TABLE_PAGE_SIZE_KEY } from '../../../common/constants';
import { useCloudPostureDataTable } from '../../../common/hooks/use_cloud_posture_data_table';
import { getFilters } from '../utils/get_filters';
import { useLatestFindings } from './use_latest_findings';

const columnsLocalStorageKey = 'cloudPosture:latestFindings:columns';

export const useLatestFindingsTable = ({
  getDefaultQuery,
  nonPersistedFilters,
  showDistributionBar,
}: {
  getDefaultQuery: (params: FindingsBaseURLQuery) => FindingsBaseURLQuery;
  nonPersistedFilters?: Filter[];
  showDistributionBar?: boolean;
}) => {
  const { dataView } = useDataViewContext();

  const cloudPostureDataTable = useCloudPostureDataTable({
    paginationLocalStorageKey: LOCAL_STORAGE_DATA_TABLE_PAGE_SIZE_KEY,
    columnsLocalStorageKey,
    defaultQuery: getDefaultQuery,
    nonPersistedFilters,
  });

  const { query, sort, queryError, setUrlQuery, filters, getRowsFromPages, pageSize } =
    cloudPostureDataTable;

  const {
    data,
    error: fetchError,
    isFetching,
    fetchNextPage,
  } = useLatestFindings({
    query,
    sort,
    enabled: !queryError,
    pageSize,
  });

  const rows = useMemo(() => getRowsFromPages(data?.pages), [data?.pages, getRowsFromPages]);

  const error = fetchError || queryError;

  const passed = data?.pages[0].count.passed || 0;
  const failed = data?.pages[0].count.failed || 0;
  const total = data?.pages[0].total || 0;

  const onDistributionBarClick = (evaluation: Evaluation) => {
    setUrlQuery({
      filters: getFilters({
        filters,
        dataView,
        field: 'result.evaluation',
        value: evaluation,
        negate: false,
      }),
    });
  };

  const canShowDistributionBar = showDistributionBar && total > 0;

  return {
    cloudPostureDataTable,
    rows,
    error,
    isFetching,
    fetchNextPage,
    passed,
    failed,
    total,
    canShowDistributionBar,
    onDistributionBarClick,
  };
};
