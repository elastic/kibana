/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import { getOr } from 'lodash/fp';
import { manageQuery } from '../../../common/components/page/manage_query';
import { TlsQuery } from '../../../network/containers/tls';
import { TlsTable } from '../../components/tls_table';
import { TlsQueryTabBodyProps } from './types';

const TlsTableManage = manageQuery(TlsTable);

export const TlsQueryTabBody = ({
  endDate,
  filterQuery,
  flowTarget,
  ip = '',
  setQuery,
  skip,
  startDate,
  type,
}: TlsQueryTabBodyProps) => (
  <TlsQuery
    endDate={endDate}
    filterQuery={filterQuery}
    flowTarget={flowTarget}
    ip={ip}
    skip={skip}
    sourceId="default"
    startDate={startDate}
    type={type}
  >
    {({ id, inspect, isInspected, tls, totalCount, pageInfo, loading, loadPage, refetch }) => (
      <TlsTableManage
        data={tls}
        id={id}
        inspect={inspect}
        isInspect={isInspected}
        fakeTotalCount={getOr(50, 'fakeTotalCount', pageInfo)}
        loading={loading}
        loadPage={loadPage}
        showMorePagesIndicator={getOr(false, 'showMorePagesIndicator', pageInfo)}
        refetch={refetch}
        setQuery={setQuery}
        totalCount={totalCount}
        type={type}
      />
    )}
  </TlsQuery>
);
