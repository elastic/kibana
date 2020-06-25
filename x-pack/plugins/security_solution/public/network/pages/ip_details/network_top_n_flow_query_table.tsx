/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getOr } from 'lodash/fp';
import React from 'react';
import { manageQuery } from '../../../common/components/page/manage_query';
import { NetworkTopNFlowTable } from '../../components/network_top_n_flow_table';
import { NetworkTopNFlowQuery } from '../../containers/network_top_n_flow';
import { NetworkWithIndexComponentsQueryTableProps } from './types';

const NetworkTopNFlowTableManage = manageQuery(NetworkTopNFlowTable);

export const NetworkTopNFlowQueryTable = ({
  endDate,
  filterQuery,
  flowTarget,
  ip,
  setQuery,
  skip,
  startDate,
  type,
}: NetworkWithIndexComponentsQueryTableProps) => (
  <NetworkTopNFlowQuery
    endDate={endDate}
    filterQuery={filterQuery}
    flowTarget={flowTarget}
    ip={ip}
    skip={skip}
    sourceId="default"
    startDate={startDate}
    type={type}
  >
    {({
      id,
      inspect,
      isInspected,
      loading,
      loadPage,
      networkTopNFlow,
      pageInfo,
      refetch,
      totalCount,
    }) => (
      <NetworkTopNFlowTableManage
        data={networkTopNFlow}
        fakeTotalCount={getOr(50, 'fakeTotalCount', pageInfo)}
        flowTargeted={flowTarget}
        id={id}
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
    )}
  </NetworkTopNFlowQuery>
);

NetworkTopNFlowQueryTable.displayName = 'NetworkTopNFlowQueryTable';
