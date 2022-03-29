/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getOr } from 'lodash/fp';
import React, { useEffect, useState } from 'react';
import { useAuthentications, ID } from '../../../hosts/containers/authentications';
import { UsersComponentsQueryProps } from './types';
import { AuthenticationTable } from '../../../hosts/components/authentications_table';
import { manageQuery } from '../../../common/components/page/manage_query';
import { useQueryToggle } from '../../../common/containers/query_toggle';

const AuthenticationTableManage = manageQuery(AuthenticationTable);

export const AuthenticationsQueryTabBody = ({
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
  const { toggleStatus } = useQueryToggle(ID);
  const [querySkip, setQuerySkip] = useState(skip || !toggleStatus);
  useEffect(() => {
    setQuerySkip(skip || !toggleStatus);
  }, [skip, toggleStatus]);

  const [
    loading,
    { authentications, totalCount, pageInfo, loadPage, id, inspect, isInspected, refetch },
  ] = useAuthentications({
    docValueFields,
    endDate,
    filterQuery,
    indexNames,
    skip: querySkip,
    startDate,
    // TODO Move authentication table and hook store to 'public/common' folder when 'usersEnabled' FF is removed
    // @ts-ignore
    type,
    deleteQuery,
  });
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
      setQuerySkip={setQuerySkip}
      totalCount={totalCount}
      docValueFields={docValueFields}
      indexNames={indexNames}
      // TODO Move authentication table and store to 'public/common' folder when 'usersEnabled' FF is removed
      // @ts-ignore
      type={type}
    />
  );
};

AuthenticationsQueryTabBody.displayName = 'AllUsersQueryTabBody';
