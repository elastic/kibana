/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getOr } from 'lodash/fp';
import React, { useEffect, useState } from 'react';
import { manageQuery } from '../../../common/components/page/manage_query';
import { NetworkTopNFlowTable } from '../../components/network_top_n_flow_table';
import { useNetworkTopNFlow, ID } from '../../containers/network_top_n_flow';
import { NetworkWithIndexComponentsQueryTableProps } from './types';
import { useQueryToggle } from '../../../common/containers/query_toggle';

const NetworkTopNFlowTableManage = manageQuery(NetworkTopNFlowTable);

export const NetworkTopNFlowQueryTable = ({
  endDate,
  filterQuery,
  flowTarget,
  ip,
  indexNames,
  setQuery,
  skip,
  startDate,
  type,
}: NetworkWithIndexComponentsQueryTableProps) => {
  const { toggleStatus } = useQueryToggle(`${ID}-${flowTarget}`);
  const [querySkip, setQuerySkip] = useState(skip || !toggleStatus);
  useEffect(() => {
    setQuerySkip(skip || !toggleStatus);
  }, [skip, toggleStatus]);
  const [
    loading,
    { id, inspect, isInspected, loadPage, networkTopNFlow, pageInfo, refetch, totalCount },
  ] = useNetworkTopNFlow({
    endDate,
    filterQuery,
    flowTarget,
    indexNames,
    ip,
    skip: querySkip,
    startDate,
    type,
  });

  return (
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
      setQuerySkip={setQuerySkip}
      showMorePagesIndicator={getOr(false, 'showMorePagesIndicator', pageInfo)}
      totalCount={totalCount}
      type={type}
    />
  );
};

NetworkTopNFlowQueryTable.displayName = 'NetworkTopNFlowQueryTable';
