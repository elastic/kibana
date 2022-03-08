/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getOr } from 'lodash/fp';
import React from 'react';
import { useAuthentications } from '../../../hosts/containers/authentications';
import { UsersComponentsQueryProps } from './types';

import { AuthenticationTable } from '../../../hosts/components/authentications_table';
import { manageQuery } from '../../../common/components/page/manage_query';

const AuthenticationTableManage = manageQuery(AuthenticationTable);

export const AllUsersQueryTabBody = ({
  endDate,
  filterQuery,
  indexNames,
  skip,
  setQuery,
  startDate,
  type,
  docValueFields,
  deleteQuery,
}: UsersComponentsQueryProps) => {
  const [
    loading,
    { authentications, totalCount, pageInfo, loadPage, id, inspect, isInspected, refetch },
  ] = useAuthentications({
    docValueFields,
    endDate,
    filterQuery,
    indexNames,
    skip,
    startDate,
    // TODO Fix me
    // @ts-ignore
    type,
    deleteQuery,
  });
  // TODO Use a different table
  return (
    <AuthenticationTableManage
      data={authentications}
      deleteQuery={deleteQuery}
      fakeTotalCount={getOr(50, 'fakeTotalCount', pageInfo)}
      id={id}
      inspect={inspect}
      isInspect={isInspected}
      loading={loading}
      loadPage={loadPage}
      refetch={refetch}
      showMorePagesIndicator={getOr(false, 'showMorePagesIndicator', pageInfo)}
      setQuery={setQuery}
      totalCount={totalCount}
      docValueFields={docValueFields}
      indexNames={indexNames}
      // TODO Fix me
      // @ts-ignore
      type={type}
    />
  );
};

AllUsersQueryTabBody.displayName = 'AllUsersQueryTabBody';
