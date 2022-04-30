/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getOr } from 'lodash/fp';
import React from 'react';
import { useHostRules } from '../../containers/host_rules';
import { HostQueryProps } from './types';
import { manageQuery } from '../../../common/components/page/manage_query';
import { HostRulesTable } from '../../components/host_rules_table';
import { uebaModel } from '../../store';

const HostRulesTableManage = manageQuery(HostRulesTable);

export const HostRulesQueryTabBody = ({
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
  const [loading, { data, totalCount, pageInfo, loadPage, id, inspect, isInspected, refetch }] =
    useHostRules({
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
    <HostRulesTableManage
      deleteQuery={deleteQuery}
      data={data}
      fakeTotalCount={getOr(50, 'fakeTotalCount', pageInfo)}
      id={id}
      inspect={inspect}
      isInspect={isInspected}
      loading={loading}
      loadPage={loadPage}
      refetch={refetch}
      setQuery={setQuery}
      showMorePagesIndicator={getOr(false, 'showMorePagesIndicator', pageInfo)}
      tableType={uebaModel.UebaTableType.userRules}
      totalCount={totalCount}
      type={type}
    />
  );
};

HostRulesQueryTabBody.displayName = 'HostRulesQueryTabBody';
