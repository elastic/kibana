/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import deepEqual from 'fast-deep-equal';
import { noop } from 'lodash/fp';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Subscription } from 'rxjs';

import { inputsModel, State } from '../../../common/store';
import { createFilter } from '../../../common/containers/helpers';
import { useKibana } from '../../../common/lib/kibana';
import {
  HostsQueries,
  HostsRiskScoreStrategyResponse,
  getHostRiskIndex,
  HostsRiskScore,
  HostRiskScoreSortField,
  HostsRiskScoreRequestOptions,
  PageInfoPaginated,
} from '../../../../common/search_strategy';
import { ESQuery } from '../../../../common/typed_json';

import * as i18n from './translations';
import { isCompleteResponse, isErrorResponse } from '../../../../../../../src/plugins/data/common';
import { getInspectResponse } from '../../../helpers';
import { InspectResponse } from '../../../types';
import { useTransforms } from '../../../transforms/containers/use_transforms';
import { useAppToasts } from '../../../common/hooks/use_app_toasts';
import { isIndexNotFoundError } from '../../../common/utils/exceptions';
import { generateTablePaginationOptions } from '../../../common/components/paginated_table/helpers';
import { useDeepEqualSelector } from '../../../common/hooks/use_selector';
import { hostsModel, hostsSelectors } from '../../store';

type LoadPage = (newActivePage: number) => void;
export interface HostRiskScoreState {
  data: HostsRiskScore[];
  inspect: InspectResponse;
  loadPage: LoadPage;
  isInspected: boolean;
  isModuleEnabled: boolean | undefined;
  refetch: inputsModel.Refetch;
  totalCount: number;
  pageInfo?: PageInfoPaginated;
}

interface UseHostRiskScore {
  filterQuery?: ESQuery | string;
  hostName?: string;
  // query latest on the default index
  onlyLatest?: boolean;
  pagination?: HostsRiskScoreRequestOptions['pagination'];
  skip?: boolean;
  sort?: HostRiskScoreSortField;
  timerange?: { to: string; from: string };
}

const isRecord = (item: unknown): item is Record<string, unknown> =>
  typeof item === 'object' && !!item;

export const isHostsRiskScoreHit = (item: Partial<HostsRiskScore>): item is HostsRiskScore =>
  isRecord(item) &&
  isRecord(item.host) &&
  typeof item.risk_stats?.risk_score === 'number' &&
  typeof item.risk === 'string';

export const useHostRiskScore = ({
  filterQuery,
  hostName,
  onlyLatest = true,
  skip = false,
  timerange,
  pagination: paginationProps,
  sort: sortProps,
}: UseHostRiskScore): [boolean, HostRiskScoreState] => {
  const { data, spaces } = useKibana().services;
  const refetch = useRef<inputsModel.Refetch>(noop);
  const abortCtrl = useRef(new AbortController());
  const searchSubscription = useRef(new Subscription());
  const [loading, setLoading] = useState(false);
  const [riskScoreRequest, setHostRiskScoreRequest] = useState<HostsRiskScoreRequestOptions | null>(
    null
  );

  const getHostRiskScoreSelector = useMemo(() => hostsSelectors.hostRiskScoreSelector(), []);
  const { activePage, limit, sort } = useDeepEqualSelector((state: State) =>
    getHostRiskScoreSelector(state, hostsModel.HostsType.page)
  );

  const wrappedLoadMore = useCallback(
    (newActivePage: number) => {
      setHostRiskScoreRequest((prevRequest) => {
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

  const { getTransformChangesIfTheyExist } = useTransforms();
  const { addError, addWarning } = useAppToasts();

  const [riskScoreResponse, setHostRiskScoreResponse] = useState<HostRiskScoreState>({
    data: [],
    inspect: {
      dsl: [],
      response: [],
    },
    isInspected: false,
    loadPage: wrappedLoadMore,
    isModuleEnabled: undefined,
    refetch: refetch.current,
    totalCount: -1,
  });

  const riskScoreSearch = useCallback(
    (request: HostsRiskScoreRequestOptions | null) => {
      if (request == null || skip) {
        return;
      }

      const asyncSearch = async () => {
        abortCtrl.current = new AbortController();
        setLoading(true);

        searchSubscription.current = data.search
          .search<HostsRiskScoreRequestOptions, HostsRiskScoreStrategyResponse>(request, {
            strategy: 'securitySolutionSearchStrategy',
            abortSignal: abortCtrl.current.signal,
          })
          .subscribe({
            next: (response) => {
              if (isCompleteResponse(response)) {
                const hits = response?.rawResponse?.hits?.hits;
                debugger;
                setHostRiskScoreResponse((prevResponse) => ({
                  ...prevResponse,
                  data:
                    onlyLatest && response.edges
                      ? response.edges.map((n) => n.node)
                      : isHostsRiskScoreHit(hits?.[0]?._source)
                      ? (hits?.map((hit) => hit._source) as HostsRiskScore[])
                      : [],
                  inspect: getInspectResponse(response, prevResponse.inspect),
                  refetch: refetch.current,
                  ...(response.pageInfo != null
                    ? {
                        pageInfo: response.pageInfo,
                      }
                    : {}),
                  totalCount: response.totalCount,
                  isModuleEnabled: true,
                }));
                searchSubscription.current.unsubscribe();
                setLoading(false);
              } else if (isErrorResponse(response)) {
                setLoading(false);
                addWarning(i18n.ERROR_RISK_SCORE);
                searchSubscription.current.unsubscribe();
              }
            },
            error: (error) => {
              setLoading(false);
              if (isIndexNotFoundError(error)) {
                setHostRiskScoreRequest((prevRequest) =>
                  !prevRequest
                    ? prevRequest
                    : {
                        ...prevRequest,
                        isModuleEnabled: false,
                      }
                );

                setLoading(false);
              } else {
                addError(error, { title: i18n.FAIL_RISK_SCORE });
              }

              searchSubscription.current.unsubscribe();
            },
          });
      };
      searchSubscription.current.unsubscribe();
      abortCtrl.current.abort();
      asyncSearch();
      refetch.current = asyncSearch;
    },
    [skip, data.search, onlyLatest, addWarning, addError]
  );
  const [spaceId, setSpaceId] = useState<string>();

  useEffect(() => {
    if (spaces) {
      spaces.getActiveSpace().then((space) => setSpaceId(space.id));
    }
  }, [spaces]);

  useEffect(() => {
    if (spaceId) {
      setHostRiskScoreRequest((prevRequest) => {
        const myRequest = {
          ...(prevRequest ?? {}),
          defaultIndex: [getHostRiskIndex(spaceId, false)],
          factoryQueryType: HostsQueries.hostsRiskScore,
          filterQuery: createFilter(filterQuery),
          pagination:
            paginationProps != null
              ? { querySize: paginationProps.querySize, cursorStart: paginationProps.cursorStart }
              : generateTablePaginationOptions(activePage, limit),
          hostNames: hostName ? [hostName] : undefined,
          onlyLatest,
          timerange: timerange
            ? { to: timerange.to, from: timerange.from, interval: '' }
            : undefined,
          sort: sortProps != null ? sortProps : sort,
        };

        if (!deepEqual(prevRequest, myRequest)) {
          return myRequest;
        }
        return prevRequest;
      });
    }
  }, [
    activePage,
    filterQuery,
    getTransformChangesIfTheyExist,
    hostName,
    limit,
    onlyLatest,
    paginationProps,
    sort,
    sortProps,
    spaceId,
    timerange,
  ]);

  useEffect(() => {
    riskScoreSearch(riskScoreRequest);
    return () => {
      searchSubscription.current.unsubscribe();
      abortCtrl.current.abort();
    };
  }, [riskScoreRequest, riskScoreSearch]);

  return [loading, riskScoreResponse];
};
