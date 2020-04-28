/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { getOr } from 'lodash/fp';
import { manageQuery } from '../../../components/page/manage_query';
import { OwnProps } from './types';
import { NetworkHttpQuery } from '../../../containers/network_http';
import { NetworkHttpTable } from '../../../components/page/network/network_http_table';

const NetworkHttpTableManage = manageQuery(NetworkHttpTable);

export const NetworkHttpQueryTable = ({
  endDate,
  filterQuery,
  ip,
  setQuery,
  skip,
  startDate,
  type,
}: OwnProps) => (
  <NetworkHttpQuery
    endDate={endDate}
    filterQuery={filterQuery}
    ip={ip}
    skip={skip}
    sourceId="default"
    startDate={startDate}
    type={type}
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
        type={type}
      />
    )}
  </NetworkHttpQuery>
);

NetworkHttpQueryTable.displayName = 'NetworkHttpQueryTable';
