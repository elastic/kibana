/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DataView } from '@kbn/data-views-plugin/common';
import { useMemo } from 'react';
import { LOCAL_STORAGE_DATA_TABLE_PAGE_SIZE_KEY } from '../../../common/constants';
import { FindingsBaseURLQuery } from '../../../common/types';
import { useCloudPostureDataTable } from '../../../common/hooks/use_cloud_posture_data_table';
import { useLatestVulnerabilities } from './use_latest_vulnerabilities';

const columnsLocalStorageKey = 'cloudPosture:latestVulnerabilities:columns';

export const useLatestVulnerabilitiesTable = ({
  dataView,
  getDefaultQuery,
}: {
  dataView: DataView;
  getDefaultQuery: (params: FindingsBaseURLQuery) => FindingsBaseURLQuery;
}) => {
  const cloudPostureTable = useCloudPostureDataTable({
    dataView,
    paginationLocalStorageKey: LOCAL_STORAGE_DATA_TABLE_PAGE_SIZE_KEY,
    columnsLocalStorageKey,
    defaultQuery: getDefaultQuery,
  });

  const { query, sort, queryError, setUrlQuery, filters, getRowsFromPages } = cloudPostureTable;

  const {
    data,
    error: fetchError,
    isFetching,
    fetchNextPage,
  } = useLatestVulnerabilities({
    query,
    sort,
    enabled: !queryError,
  });

  const rows = useMemo(() => getRowsFromPages(data?.pages), [data?.pages, getRowsFromPages]);

  const error = fetchError || queryError;

  return {
    cloudPostureTable,
    rows,
    error,
    isFetching,
    fetchNextPage,
  };
};
