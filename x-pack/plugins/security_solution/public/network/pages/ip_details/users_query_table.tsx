/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { getOr } from 'lodash/fp';
import { manageQuery } from '../../../common/components/page/manage_query';
import { UsersQuery } from '../../containers/users';
import { NetworkComponentsQueryProps } from './types';
import { UsersTable } from '../../components/users_table';

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
}: NetworkComponentsQueryProps) => (
  <UsersQuery
    endDate={endDate}
    filterQuery={filterQuery}
    flowTarget={flowTarget}
    ip={ip}
    skip={skip}
    sourceId="default"
    startDate={startDate}
    type={type}
  >
    {({ id, inspect, isInspected, users, totalCount, pageInfo, loading, loadPage, refetch }) => (
      <UsersTableManage
        data={users}
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
        totalCount={totalCount}
        type={type}
      />
    )}
  </UsersQuery>
);

UsersQueryTable.displayName = 'UsersQueryTable';
