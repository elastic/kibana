/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { getOr } from 'lodash/fp';

import { NetworkTopCountriesTable } from '../../components/network_top_countries_table';
import { useNetworkTopCountries } from '../../containers/network_top_countries';
import { networkModel } from '../../store';
import { manageQuery } from '../../../common/components/page/manage_query';

import { IPsQueryTabBodyProps as CountriesQueryTabBodyProps } from './types';

const NetworkTopCountriesTableManage = manageQuery(NetworkTopCountriesTable);

export const CountriesQueryTabBody = ({
  endDate,
  filterQuery,
  indexNames,
  skip,
  startDate,
  setQuery,
  indexPattern,
  flowTarget,
}: CountriesQueryTabBodyProps) => {
  const [
    loading,
    { id, inspect, isInspected, loadPage, networkTopCountries, pageInfo, refetch, totalCount },
  ] = useNetworkTopCountries({
    endDate,
    flowTarget,
    filterQuery,
    indexNames,
    skip,
    startDate,
    type: networkModel.NetworkType.page,
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
      type={networkModel.NetworkType.page}
    />
  );
};

CountriesQueryTabBody.displayName = 'CountriesQueryTabBody';
