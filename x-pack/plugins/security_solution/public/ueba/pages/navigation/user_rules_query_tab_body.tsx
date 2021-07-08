/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getOr } from 'lodash/fp';
import React from 'react';
import { useUserRules } from '../../containers/user_rules';
import { UserRulesQueryProps } from './types';
import { manageQuery } from '../../../common/components/page/manage_query';
import { HostRulesTable } from '../../components/host_rules_table';

const UserRulesTableManage = manageQuery(HostRulesTable);

export const UserRulesQueryTabBody = ({
  deleteQuery,
  docValueFields,
  endDate,
  filterQuery,
  hostName,
  indexNames,
  skip,
  setQuery,
  startDate,
  type,
}: UserRulesQueryProps) => {
  const [loading, { data, loadPage, id, inspect, isInspected, refetch }] = useUserRules({
    docValueFields,
    endDate,
    filterQuery,
    hostName,
    indexNames,
    skip,
    startDate,
    type,
  });

  return data.map((user) => (
    <UserRulesTableManage
      deleteQuery={deleteQuery}
      data={user.edges}
      fakeTotalCount={getOr(50, 'fakeTotalCount', user.pageInfo)}
      id={id}
      inspect={inspect}
      isInspect={isInspected}
      loading={loading}
      loadPage={loadPage}
      refetch={refetch}
      setQuery={setQuery}
      showMorePagesIndicator={getOr(false, 'showMorePagesIndicator', user.pageInfo)}
      totalCount={user.totalCount}
      type={type}
    />
  ));
};

UserRulesQueryTabBody.displayName = 'UserRulesQueryTabBody';
