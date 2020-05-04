/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { getOr } from 'lodash/fp';

import { NetworkHttpTable } from '../../../components/page/network';
import { NetworkHttpQuery } from '../../../containers/network_http';
import { networkModel } from '../../../store';
import { manageQuery } from '../../../components/page/manage_query';

import { HttpQueryTabBodyProps } from './types';

const NetworkHttpTableManage = manageQuery(NetworkHttpTable);

export const HttpQueryTabBody = ({
  endDate,
  filterQuery,
  skip,
  startDate,
  setQuery,
}: HttpQueryTabBodyProps) => (
  <NetworkHttpQuery
    endDate={endDate}
    filterQuery={filterQuery}
    skip={skip}
    sourceId="default"
    startDate={startDate}
    type={networkModel.NetworkType.page}
  >
    {({
      id,
      inspect,
      isInspected,
      loading,
      loadPage,
      networkHttp,
      pageInfo,
      refetch,
      totalCount,
    }) => (
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
    )}
  </NetworkHttpQuery>
);

HttpQueryTabBody.displayName = 'HttpQueryTabBody';
