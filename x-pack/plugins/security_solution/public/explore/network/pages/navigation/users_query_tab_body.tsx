/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getOr } from 'lodash/fp';
import React, { useEffect, useState } from 'react';
import { manageQuery } from '../../../../common/components/page/manage_query';
import { useQueryToggle } from '../../../../common/containers/query_toggle';
import { UsersTable } from '../../components/users_table';
import { ID, useNetworkUsers } from '../../containers/users';
import type { IPQueryTabBodyProps } from './types';

const UsersTableManage = manageQuery(UsersTable);

export const UsersQueryTabBody = ({
  endDate,
  filterQuery,
  flowTarget,
  ip,
  setQuery,
  skip,
  startDate,
  type,
}: IPQueryTabBodyProps) => {
  const queryId = `${ID}-${type}`;
  const { toggleStatus } = useQueryToggle(queryId);
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
    id: queryId,
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

UsersQueryTabBody.displayName = 'UsersQueryTable';
