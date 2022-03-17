/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getOr } from 'lodash/fp';
import React, { useEffect, useState } from 'react';
import { manageQuery } from '../../../common/components/page/manage_query';
import { TlsTable } from '../../components/tls_table';
import { ID, useNetworkTls } from '../../containers/tls';
import { TlsQueryTableComponentProps } from './types';
import { useQueryToggle } from '../../../common/containers/query_toggle';

const TlsTableManage = manageQuery(TlsTable);

export const TlsQueryTable = ({
  endDate,
  filterQuery,
  flowTarget,
  indexNames,
  ip,
  setQuery,
  skip,
  startDate,
  type,
}: TlsQueryTableComponentProps) => {
  const { toggleStatus } = useQueryToggle(ID);
  const [querySkip, setQuerySkip] = useState(skip || !toggleStatus);
  useEffect(() => {
    setQuerySkip(skip || !toggleStatus);
  }, [skip, toggleStatus]);
  const [loading, { id, inspect, isInspected, tls, totalCount, pageInfo, loadPage, refetch }] =
    useNetworkTls({
      endDate,
      filterQuery,
      flowTarget,
      indexNames,
      ip,
      skip: querySkip,
      startDate,
      type,
    });

  return (
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
      setQuerySkip={setQuerySkip}
      totalCount={totalCount}
      type={type}
    />
  );
};

TlsQueryTable.displayName = 'TlsQueryTable';
