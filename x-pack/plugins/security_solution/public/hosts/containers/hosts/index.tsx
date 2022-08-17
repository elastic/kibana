/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import deepEqual from 'fast-deep-equal';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useDispatch } from 'react-redux';

import { get } from 'lodash';
import type { inputsModel, State } from '../../../common/store';
import { createFilter } from '../../../common/containers/helpers';
import { useDeepEqualSelector } from '../../../common/hooks/use_selector';
import type { hostsModel } from '../../store';
import { hostsActions, hostsSelectors } from '../../store';
import { generateTablePaginationOptions } from '../../../common/components/paginated_table/helpers';
import type {
  HostsEdges,
  PageInfoPaginated,
  DocValueFields,
  HostsRequestOptions,
  RiskSeverity,
} from '../../../../common/search_strategy';
import { HostsQueries } from '../../../../common/search_strategy';
import type { ESTermQuery } from '../../../../common/typed_json';

import * as i18n from './translations';
import type { InspectResponse } from '../../../types';
import { useSearchStrategy } from '../../../common/containers/use_search_strategy';
import { getHostsColumns } from '../../components/hosts_table/columns';
import { useIsExperimentalFeatureEnabled } from '../../../common/hooks/use_experimental_features';
import { SecurityPageName } from '../../../../common/constants';
import { HostsTableType } from '../../store/model';
import { useNavigateTo } from '../../../common/lib/kibana';

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
  endDate: string;
  filterQuery?: ESTermQuery | string;
  indexNames: string[];
  skip?: boolean;
  startDate: string;
  type: hostsModel.HostsType;
}

export const useAllHost = ({
  docValueFields,
  endDate,
  filterQuery,
  indexNames,
  skip = false,
  startDate,
  type,
  adapters,
}: UseAllHost): [boolean, HostsArgs] => {
  const getHostsSelector = useMemo(() => hostsSelectors.hostsSelector(), []);
  const { activePage, direction, limit, sortField } = useDeepEqualSelector((state: State) =>
    getHostsSelector(state, type)
  );
  const [hostsRequest, setHostRequest] = useState<HostsRequestOptions | null>(null);
  const dispatch = useDispatch();
  const { navigateTo } = useNavigateTo();

  const riskyHostsFeatureEnabled = useIsExperimentalFeatureEnabled('riskyHostsEnabled');
  const dispatchSeverityUpdate = useCallback(
    (s: RiskSeverity) => {
      dispatch(
        hostsActions.updateHostRiskScoreSeverityFilter({
          severitySelection: [s],
          hostsType: type,
        })
      );
      navigateTo({
        deepLinkId: SecurityPageName.hosts,
        path: HostsTableType.risk,
      });
    },
    [dispatch, navigateTo, type]
  );
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

  useEffect(() => {
    if (!loading) {
      const columns = getHostsColumns(riskyHostsFeatureEnabled, dispatchSeverityUpdate).map(
        (c) => ({
          id: c?.field,
          name: c?.name,
          meta: '',
        })
      );
      adapters.tables.logDatatable('default', {
        type: 'test table',
        columns,
        // rows: [{ id: '@timestamp', value: 'my test value' }],
        rows: response.edges?.map((edge) => {
          return columns.reduce((acc, curr) => {
            if (curr.id) {
              acc[curr.id] = (get(edge, curr.id) ?? []).join(', ');
            }
            return acc;
          }, {});
        }),
      });
    }
  }, [adapters.tables, response.edges, loading, riskyHostsFeatureEnabled, dispatchSeverityUpdate]);

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
        adapters,
        startTime: Date.now(),
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
    adapters,
  ]);

  useEffect(() => {
    if (!skip && hostsRequest) {
      search(hostsRequest);
    }
  }, [hostsRequest, search, skip]);

  return [loading, hostsResponse];
};
