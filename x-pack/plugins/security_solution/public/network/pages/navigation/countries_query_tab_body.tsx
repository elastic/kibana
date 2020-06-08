/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { getOr } from 'lodash/fp';

import { NetworkTopCountriesTable } from '../../components/network_top_countries_table';
import { NetworkTopCountriesQuery } from '../../containers/network_top_countries';
import { networkModel } from '../../store';
import { manageQuery } from '../../../common/components/page/manage_query';

import { IPsQueryTabBodyProps as CountriesQueryTabBodyProps } from './types';

const NetworkTopCountriesTableManage = manageQuery(NetworkTopCountriesTable);

export const CountriesQueryTabBody = ({
  endDate,
  filterQuery,
  skip,
  startDate,
  setQuery,
  indexPattern,
  flowTarget,
}: CountriesQueryTabBodyProps) => (
  <NetworkTopCountriesQuery
    endDate={endDate}
    flowTarget={flowTarget}
    filterQuery={filterQuery}
    skip={skip}
    sourceId="default"
    startDate={startDate}
    type={networkModel.NetworkType.page}
  >
    {({
      id,
      inspect,
      isInspected,
      loading,
      loadPage,
      networkTopCountries,
      pageInfo,
      refetch,
      totalCount,
    }) => (
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
    )}
  </NetworkTopCountriesQuery>
);

CountriesQueryTabBody.displayName = 'CountriesQueryTabBody';
