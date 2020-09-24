/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { getOr } from 'lodash/fp';
import { manageQuery } from '../../../common/components/page/manage_query';
import { NetworkWithIndexComponentsQueryTableProps } from './types';
import { useNetworkTopCountries } from '../../containers/network_top_countries';
import { NetworkTopCountriesTable } from '../../components/network_top_countries_table';

const NetworkTopCountriesTableManage = manageQuery(NetworkTopCountriesTable);

export const NetworkTopCountriesQueryTable = ({
  endDate,
  filterQuery,
  flowTarget,
  ip,
  setQuery,
  skip,
  startDate,
  type,
  indexPattern,
}: NetworkWithIndexComponentsQueryTableProps) => {
  const [
    loading,
    { id, inspect, isInspected, loadPage, networkTopCountries, pageInfo, refetch, totalCount },
  ] = useNetworkTopCountries({
    endDate,
    flowTarget,
    filterQuery,
    indexNames: [],
    ip,
    skip,
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
      showMorePagesIndicator={getOr(false, 'showMorePagesIndicator', pageInfo)}
      totalCount={totalCount}
      type={type}
    />
  );
};

NetworkTopCountriesQueryTable.displayName = 'NetworkTopCountriesQueryTable';
