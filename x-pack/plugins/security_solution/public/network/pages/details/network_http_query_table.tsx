/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { getOr } from 'lodash/fp';
import { manageQuery } from '../../../common/components/page/manage_query';
import { OwnProps } from './types';
import { useNetworkHttp } from '../../containers/network_http';
import { NetworkHttpTable } from '../../components/network_http_table';

const NetworkHttpTableManage = manageQuery(NetworkHttpTable);

export const NetworkHttpQueryTable = ({
  endDate,
  filterQuery,
  indexNames,
  ip,
  setQuery,
  skip,
  startDate,
  type,
}: OwnProps) => {
  const [
    loading,
    { id, inspect, isInspected, loadPage, networkHttp, pageInfo, refetch, totalCount },
  ] = useNetworkHttp({
    endDate,
    filterQuery,
    indexNames,
    ip,
    skip,
    startDate,
    type,
  });

  return (
    <NetworkHttpTableManage
      data={networkHttp}
      fakeTotalCount={getOr(50, 'fakeTotalCount', pageInfo)}
      id={id}
      inspect={inspect}
      isInspect={isInspected}
      loading={loading}
      loadPage={loadPage}
      refetch={refetch}
      setQuery={setQuery}
      showMorePagesIndicator={getOr(false, 'showMorePagesIndicator', pageInfo)}
      totalCount={totalCount}
      type={type}
    />
  );
};

NetworkHttpQueryTable.displayName = 'NetworkHttpQueryTable';
