/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';
import { getOr } from 'lodash/fp';
import { manageQuery } from '../../../common/components/page/manage_query';
import { useNetworkUsers, ID } from '../../containers/users';
import { NetworkComponentsQueryProps } from './types';
import { UsersTable } from '../../components/users_table';
import { useQueryToggle } from '../../../common/containers/query_toggle';

const UsersTableManage = manageQuery(UsersTable);

export const UsersQueryTable = ({
  endDate,
  filterQuery,
  flowTarget,
  ip,
  setQuery,
  skip,
  startDate,
  type,
}: NetworkComponentsQueryProps) => {
  const { toggleStatus } = useQueryToggle(ID);
  const [querySkip, setQuerySkip] = useState(skip || !toggleStatus);
  useEffect(() => {
    setQuerySkip(skip || !toggleStatus);
  }, [skip, toggleStatus]);
  const [
    loading,
    { id, inspect, isInspected, networkUsers, totalCount, pageInfo, loadPage, refetch },
  ] = useNetworkUsers({
    endDate,
    filterQuery,
    flowTarget,
    ip,
    skip: querySkip,
    startDate,
  });

  return (
    <UsersTableManage
      data={networkUsers}
      id={id}
      inspect={inspect}
      isInspect={isInspected}
      flowTarget={flowTarget}
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

UsersQueryTable.displayName = 'UsersQueryTable';
