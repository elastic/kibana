/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getOr } from 'lodash/fp';
import React from 'react';
import { useAllHost } from '../../containers/hosts';
import { HostsComponentsQueryProps } from './types';
import { HostsTable } from '../../components/hosts_table';
import { manageQuery } from '../../../common/components/page/manage_query';

const HostsTableManage = manageQuery(HostsTable);

export const HostsQueryTabBody = ({
  deleteQuery,
  docValueFields,
  endDate,
  filterQuery,
  indexPattern,
  skip,
  setQuery,
  startDate,
  type,
}: HostsComponentsQueryProps) => {
  const [
    loading,
    { hosts, totalCount, pageInfo, loadPage, id, inspect, isInspected, refetch },
  ] = useAllHost({ docValueFields, endDate, filterQuery, startDate, type });
  return (
    <HostsTableManage
      deleteQuery={deleteQuery}
      data={hosts}
      fakeTotalCount={getOr(50, 'fakeTotalCount', pageInfo)}
      id={id}
      indexPattern={indexPattern}
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

HostsQueryTabBody.displayName = 'HostsQueryTabBody';
