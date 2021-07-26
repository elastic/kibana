/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getOr } from 'lodash/fp';
import React from 'react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { useUserRules } from '../../containers/user_rules';
import { HostQueryProps } from './types';
import { manageQuery } from '../../../common/components/page/manage_query';
import { HostRulesTable } from '../../components/host_rules_table';
import { uebaModel } from '../../store';
import { UserRulesFields } from '../../../../common';

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
}: HostQueryProps) => {
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
  return (
    <EuiFlexGroup direction="column">
      {data.map((user, i) => (
        <EuiFlexItem key={`${id}${i}`}>
          <UserRulesTableManage
            deleteQuery={deleteQuery}
            data={user.edges}
            headerSupplement={<p>{`Total user risk score: ${user[UserRulesFields.riskScore]}`}</p>}
            headerTitle={`user.name: ${user[UserRulesFields.userName]}`}
            fakeTotalCount={getOr(50, 'fakeTotalCount', user.pageInfo)}
            id={`${id}${i}`}
            inspect={inspect}
            isInspect={isInspected}
            loading={loading}
            loadPage={loadPage}
            refetch={refetch}
            setQuery={setQuery}
            showMorePagesIndicator={getOr(false, 'showMorePagesIndicator', user.pageInfo)}
            tableType={uebaModel.UebaTableType.userRules} // pagination will not work until this is unique
            totalCount={user.totalCount}
            type={type}
          />
        </EuiFlexItem>
      ))}
    </EuiFlexGroup>
  );
};

UserRulesQueryTabBody.displayName = 'UserRulesQueryTabBody';
