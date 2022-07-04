/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import deepEqual from 'fast-deep-equal';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { inputsModel, State } from '../../../common/store';
import { createFilter } from '../../../common/containers/helpers';
import { useDeepEqualSelector } from '../../../common/hooks/use_selector';
import { hostsModel, hostsSelectors } from '../../store';
import { generateTablePaginationOptions } from '../../../common/components/paginated_table/helpers';
import {
  HostsEdges,
  PageInfoPaginated,
  DocValueFields,
  HostsQueries,
  HostsRequestOptions,
} from '../../../../common/search_strategy';
import { ESTermQuery } from '../../../../common/typed_json';

import * as i18n from './translations';
import { InspectResponse } from '../../../types';
import { useSearchStrategy } from '../../../common/containers/use_search_strategy';

export const ID = 'hostsAllQuery';

type LoadPage = (newActivePage: number) => void;
export interface HostsArgs {
  endDate: string;
  hosts: HostsEdges[];
  id: string;
  inspect: InspectResponse;
  isInspected: boolean;
  loadPage: LoadPage;
  pageInfo: PageInfoPaginated;
  refetch: inputsModel.Refetch;
  startDate: string;
  totalCount: number;
}

interface UseAllHost {
  docValueFields?: DocValueFields[];
  filterQuery?: ESTermQuery | string;
  endDate: string;
  indexNames: string[];
  skip?: boolean;
  startDate: string;
  type: hostsModel.HostsType;
}

export const useAllHost = ({
  docValueFields,
  filterQuery,
  endDate,
  indexNames,
  skip = false,
  startDate,
  type,
}: UseAllHost): [boolean, HostsArgs] => {
  const getHostsSelector = useMemo(() => hostsSelectors.hostsSelector(), []);
  const { activePage, direction, limit, sortField } = useDeepEqualSelector((state: State) =>
    getHostsSelector(state, type)
  );

  const [hostsRequest, setHostRequest] = useState<HostsRequestOptions | null>(null);

  const wrappedLoadMore = useCallback(
    (newActivePage: number) => {
      setHostRequest((prevRequest) => {
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
  } = useSearchStrategy<HostsQueries.hosts>({
    factoryQueryType: HostsQueries.hosts,
    initialResult: {
      edges: [],
      totalCount: -1,
      pageInfo: {
        activePage: 0,
        fakeTotalCount: 0,
        showMorePagesIndicator: false,
      },
    },
    errorMessage: i18n.FAIL_ALL_HOST,
    abort: skip,
  });

  const hostsResponse = useMemo(
    () => ({
      endDate,
      hosts: response.edges,
      id: ID,
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
    setHostRequest((prevRequest) => {
      const myRequest = {
        ...(prevRequest ?? {}),
        defaultIndex: indexNames,
        docValueFields: docValueFields ?? [],
        factoryQueryType: HostsQueries.hosts,
        filterQuery: createFilter(filterQuery),
        pagination: generateTablePaginationOptions(activePage, limit),
        timerange: {
          interval: '12h',
          from: startDate,
          to: endDate,
        },
        sort: {
          direction,
          field: sortField,
        },
      };
      if (!deepEqual(prevRequest, myRequest)) {
        return myRequest;
      }
      return prevRequest;
    });
  }, [
    activePage,
    direction,
    docValueFields,
    endDate,
    filterQuery,
    indexNames,
    limit,
    startDate,
    sortField,
  ]);

  useEffect(() => {
    if (!skip && hostsRequest) {
      search(hostsRequest);
    }
  }, [hostsRequest, search, skip]);

  return [loading, hostsResponse];
};
