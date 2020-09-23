/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { getOr } from 'lodash/fp';

import { NetworkTopNFlowTable } from '../../components/network_top_n_flow_table';
import { useNetworkTopNFlow } from '../../containers/network_top_n_flow';
import { networkModel } from '../../store';
import { manageQuery } from '../../../common/components/page/manage_query';

import { IPsQueryTabBodyProps } from './types';

const NetworkTopNFlowTableManage = manageQuery(NetworkTopNFlowTable);

export const IPsQueryTabBody = ({
  endDate,
  filterQuery,
  indexNames,
  skip,
  startDate,
  setQuery,
  flowTarget,
}: IPsQueryTabBodyProps) => {
  const [
    loading,
    { id, inspect, isInspected, loadPage, networkTopNFlow, pageInfo, refetch, totalCount },
  ] = useNetworkTopNFlow({
    endDate,
    flowTarget,
    filterQuery,
    indexNames,
    skip,
    startDate,
    type: networkModel.NetworkType.page,
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
      showMorePagesIndicator={getOr(false, 'showMorePagesIndicator', pageInfo)}
      totalCount={totalCount}
      type={networkModel.NetworkType.page}
    />
  );
};

IPsQueryTabBody.displayName = 'IPsQueryTabBody';
