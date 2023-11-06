/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import deepEqual from 'fast-deep-equal';

import type { NetworkTopCountriesRequestOptionsInput } from '../../../../../common/api/search_strategy';
import type { ESTermQuery } from '../../../../../common/typed_json';
import type { inputsModel } from '../../../../common/store';
import { useDeepEqualSelector } from '../../../../common/hooks/use_selector';
import { createFilter } from '../../../../common/containers/helpers';
import { generateTablePaginationOptions } from '../../../components/paginated_table/helpers';
import type { networkModel } from '../../store';
import { networkSelectors } from '../../store';
import type {
  FlowTargetSourceDest,
  NetworkTopCountriesEdges,
  PageInfoPaginated,
} from '../../../../../common/search_strategy';
import { NetworkQueries } from '../../../../../common/search_strategy';
import type { InspectResponse } from '../../../../types';
import * as i18n from './translations';
import { useSearchStrategy } from '../../../../common/containers/use_search_strategy';

export const ID = 'networkTopCountriesQuery';

export interface NetworkTopCountriesArgs {
  id: string;
  inspect: InspectResponse;
  isInspected: boolean;
  loadPage: (newActivePage: number) => void;
  networkTopCountries: NetworkTopCountriesEdges[];
  pageInfo: PageInfoPaginated;
  refetch: inputsModel.Refetch;
  totalCount: number;
}

interface UseNetworkTopCountries {
  endDate: string;
  filterQuery?: ESTermQuery | string;
  flowTarget: FlowTargetSourceDest;
  id: string;
  indexNames: string[];
  ip?: string;
  skip: boolean;
  startDate: string;
  type: networkModel.NetworkType;
}

export const useNetworkTopCountries = ({
  endDate,
  filterQuery,
  flowTarget,
  id,
  indexNames,
  ip,
  skip,
  startDate,
  type,
}: UseNetworkTopCountries): [boolean, NetworkTopCountriesArgs] => {
  const getTopCountriesSelector = useMemo(() => networkSelectors.topCountriesSelector(), []);
  const { activePage, limit, sort } = useDeepEqualSelector((state) =>
    getTopCountriesSelector(state, type, flowTarget)
  );

  const [networkTopCountriesRequest, setNetworkTopCountriesRequest] =
    useState<NetworkTopCountriesRequestOptionsInput | null>(null);

  const wrappedLoadMore = useCallback(
    (newActivePage: number) => {
      setNetworkTopCountriesRequest((prevRequest) => {
        if (!prevRequest) {
          return prevRequest;
        }

        return {
          ...prevRequest,
          pagination: generateTablePaginationOptions(newActivePage, limit),
        };
      });
    },
    [limit]
  );

  const {
    loading,
    result: response,
    search,
    refetch,
    inspect,
  } = useSearchStrategy<NetworkQueries.topCountries>({
    factoryQueryType: NetworkQueries.topCountries,
    initialResult: {
      edges: [],
      totalCount: -1,
      pageInfo: {
        activePage: 0,
        fakeTotalCount: 0,
        showMorePagesIndicator: false,
      },
    },
    errorMessage: i18n.FAIL_NETWORK_TOP_COUNTRIES,
    abort: skip,
  });

  const networkTopCountriesResponse = useMemo(
    () => ({
      endDate,
      networkTopCountries: response.edges,
      id,
      inspect,
      isInspected: false,
      loadPage: wrappedLoadMore,
      pageInfo: response.pageInfo,
      refetch,
      startDate,
      totalCount: response.totalCount,
    }),
    [
      endDate,
      id,
      inspect,
      refetch,
      response.edges,
      response.pageInfo,
      response.totalCount,
      startDate,
      wrappedLoadMore,
    ]
  );

  useEffect(() => {
    setNetworkTopCountriesRequest((prevRequest) => {
      const myRequest: NetworkTopCountriesRequestOptionsInput = {
        ...(prevRequest ?? {}),
        defaultIndex: indexNames,
        factoryQueryType: NetworkQueries.topCountries,
        filterQuery: createFilter(filterQuery),
        flowTarget,
        ip,
        pagination: generateTablePaginationOptions(activePage, limit),
        sort,
        timerange: {
          interval: '12h',
          from: startDate,
          to: endDate,
        },
      };
      if (!deepEqual(prevRequest, myRequest)) {
        return myRequest;
      }
      return prevRequest;
    });
  }, [activePage, indexNames, endDate, filterQuery, ip, limit, startDate, sort, flowTarget]);

  useEffect(() => {
    if (!skip && networkTopCountriesRequest) {
      search(networkTopCountriesRequest);
    }
  }, [networkTopCountriesRequest, search, skip]);

  return [loading, networkTopCountriesResponse];
};
