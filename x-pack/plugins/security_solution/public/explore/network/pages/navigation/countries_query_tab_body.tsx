/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';
import { getOr } from 'lodash/fp';

import { NetworkTopCountriesTable } from '../../components/network_top_countries_table';
import { useNetworkTopCountries, ID } from '../../containers/network_top_countries';
import { manageQuery } from '../../../../common/components/page/manage_query';

import type { IPsQueryTabBodyProps as CountriesQueryTabBodyProps } from './types';
import { useQueryToggle } from '../../../../common/containers/query_toggle';

const NetworkTopCountriesTableManage = manageQuery(NetworkTopCountriesTable);

export const CountriesQueryTabBody = ({
  endDate,
  filterQuery,
  flowTarget,
  indexNames,
  indexPattern,
  ip,
  setQuery,
  skip,
  startDate,
  type,
}: CountriesQueryTabBodyProps) => {
  const queryId = `${ID}-${flowTarget}-${type}`;
  const { toggleStatus } = useQueryToggle(queryId);
  const [querySkip, setQuerySkip] = useState(skip || !toggleStatus);
  useEffect(() => {
    setQuerySkip(skip || !toggleStatus);
  }, [skip, toggleStatus]);
  const [
    loading,
    { id, inspect, isInspected, loadPage, networkTopCountries, pageInfo, refetch, totalCount },
  ] = useNetworkTopCountries({
    endDate,
    flowTarget,
    filterQuery,
    id: queryId,
    indexNames,
    ip,
    skip: querySkip,
    startDate,
    type,
  });

  return (
    <NetworkTopCountriesTableManage
      data={networkTopCountries}
      fakeTotalCount={getOr(50, 'fakeTotalCount', pageInfo)}
      flowTargeted={flowTarget}
      id={id}
      indexPattern={indexPattern}
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

CountriesQueryTabBody.displayName = 'CountriesQueryTabBody';
