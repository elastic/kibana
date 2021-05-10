/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { getOr } from 'lodash/fp';

import { NetworkHttpTable } from '../../components/network_http_table';
import { useNetworkHttp } from '../../containers/network_http';
import { networkModel } from '../../store';
import { manageQuery } from '../../../common/components/page/manage_query';

import { HttpQueryTabBodyProps } from './types';

const NetworkHttpTableManage = manageQuery(NetworkHttpTable);

export const HttpQueryTabBody = ({
  endDate,
  filterQuery,
  indexNames,
  skip,
  startDate,
  setQuery,
}: HttpQueryTabBodyProps) => {
  const [
    loading,
    { id, inspect, isInspected, loadPage, networkHttp, pageInfo, refetch, totalCount },
  ] = useNetworkHttp({
    endDate,
    filterQuery,
    indexNames,
    skip,
    startDate,
    type: networkModel.NetworkType.page,
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
      type={networkModel.NetworkType.page}
    />
  );
};

HttpQueryTabBody.displayName = 'HttpQueryTabBody';
