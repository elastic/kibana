/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DataView } from '@kbn/data-views-plugin/common';
import { Filter } from '@kbn/es-query';
import { useMemo } from 'react';
import { FindingsBaseURLQuery } from '../../../common/types';
import { Evaluation } from '../../../../common/types';
import { LOCAL_STORAGE_DATA_TABLE_PAGE_SIZE_KEY } from '../../../common/constants';
import { useCloudPostureDataTable } from '../../../common/hooks/use_cloud_posture_data_table';
import { getFilters } from '../utils/get_filters';
import { useLatestFindings } from './use_latest_findings';

const columnsLocalStorageKey = 'cloudPosture:latestFindings:columns';

export const useLatestFindingsTable = ({
  dataView,
  getDefaultQuery,
  nonPersistedFilters,
  showDistributionBar,
}: {
  dataView: DataView;
  getDefaultQuery: (params: FindingsBaseURLQuery) => FindingsBaseURLQuery;
  nonPersistedFilters?: Filter[];
  showDistributionBar?: boolean;
}) => {
  const cloudPostureTable = useCloudPostureDataTable({
    dataView,
    paginationLocalStorageKey: LOCAL_STORAGE_DATA_TABLE_PAGE_SIZE_KEY,
    columnsLocalStorageKey,
    defaultQuery: getDefaultQuery,
    nonPersistedFilters,
  });

  const { query, sort, queryError, setUrlQuery, filters, getRowsFromPages } = cloudPostureTable;

  const {
    data,
    error: fetchError,
    isFetching,
    fetchNextPage,
  } = useLatestFindings({
    query,
    sort,
    enabled: !queryError,
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
    cloudPostureTable,
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
