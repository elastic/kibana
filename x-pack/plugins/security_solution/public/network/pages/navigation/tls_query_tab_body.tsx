/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { getOr } from 'lodash/fp';
import { manageQuery } from '../../../common/components/page/manage_query';
import { useNetworkTls } from '../../../network/containers/tls';
import { TlsTable } from '../../components/tls_table';
import { TlsQueryTabBodyProps } from './types';

const TlsTableManage = manageQuery(TlsTable);

const TlsQueryTabBodyComponent: React.FC<TlsQueryTabBodyProps> = ({
  endDate,
  filterQuery,
  flowTarget,
  indexNames,
  ip = '',
  setQuery,
  skip,
  startDate,
  type,
}) => {
  const [loading, { id, inspect, isInspected, tls, totalCount, pageInfo, loadPage, refetch }] =
    useNetworkTls({
      endDate,
      filterQuery,
      flowTarget,
      indexNames,
      ip,
      skip,
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
      totalCount={totalCount}
      type={type}
    />
  );
};

TlsQueryTabBodyComponent.displayName = 'TlsQueryTabBodyComponent';

export const TlsQueryTabBody = React.memo(TlsQueryTabBodyComponent);
