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
import { useDeepEqualSelector } from '../../../common/hooks/use_selector';
import { hostsModel, hostsSelectors } from '../../store';
import { generateTablePaginationOptions } from '../../../common/components/paginated_table/helpers';
import {
  PageInfoPaginated,
  DocValueFields,
  HostsQueries,
  HostsRiskScoreStrategyResponse,
  getHostRiskIndex,
  HostsRiskScore,
  RiskScoreRequestOptions,
} from '../../../../common/search_strategy';
import { ESQuery } from '../../../../common/typed_json';

import * as i18n from './translations';
import { isCompleteResponse, isErrorResponse } from '../../../../../../../src/plugins/data/common';
import { getInspectResponse } from '../../../helpers';
import { InspectResponse } from '../../../types';
import { useTransforms } from '../../../transforms/containers/use_transforms';
import { useAppToasts } from '../../../common/hooks/use_app_toasts';
import { isHostsRiskScoreHit } from '../../../common/containers/hosts_risk/use_hosts_risk_score';

export const ID = 'riskScoreQuery';

type LoadPage = (newActivePage: number) => void;
export interface RiskScoreBetterState {
  data: HostsRiskScore[];
  endDate: string;
  id: string;
  inspect: InspectResponse;
  isInspected: boolean;
  loadPage: LoadPage;
  pageInfo: PageInfoPaginated;
  refetch: inputsModel.Refetch;
  startDate: string;
  totalCount: number;
}

interface UseRiskScoreBetter {
  docValueFields?: DocValueFields[];
  endDate: string;
  filterQuery?: ESQuery | string;
  skip?: boolean;
  startDate: string;
  type: hostsModel.HostsType;
}

export const useRiskScoreBetter = ({
  docValueFields,
  endDate,
  filterQuery,
  skip = false,
  startDate,
}: UseRiskScoreBetter): [boolean, RiskScoreBetterState] => {
  const getRiskScoreBetterSelector = useMemo(() => hostsSelectors.hostRiskScoreSelector(), []);
  const { activePage, limit, sort } = useDeepEqualSelector((state: State) =>
    getRiskScoreBetterSelector(state, hostsModel.HostsType.page)
  );
  const { data, spaces } = useKibana().services;
  const refetch = useRef<inputsModel.Refetch>(noop);
  const abortCtrl = useRef(new AbortController());
  const searchSubscription = useRef(new Subscription());
  const [loading, setLoading] = useState(false);
  const [riskScoreRequest, setRiskScoreBetterRequest] = useState<RiskScoreRequestOptions | null>(
    null
  );
  const { getTransformChangesIfTheyExist } = useTransforms();
  const { addError, addWarning } = useAppToasts();

  const wrappedLoadMore = useCallback(
    (newActivePage: number) => {
      setRiskScoreBetterRequest((prevRequest) =>
        !prevRequest
          ? prevRequest
          : {
              ...prevRequest,
              pagination: generateTablePaginationOptions(newActivePage, limit, true),
            }
      );
    },
    [limit]
  );

  const [riskScoreResponse, setRiskScoreBetterResponse] = useState<RiskScoreBetterState>({
    data: [],
    endDate,
    id: ID,
    inspect: {
      dsl: [],
      response: [],
    },
    isInspected: false,
    loadPage: wrappedLoadMore,
    pageInfo: {
      activePage: 0,
      fakeTotalCount: 0,
      showMorePagesIndicator: false,
    },
    refetch: refetch.current,
    startDate,
    totalCount: -1,
  });

  const riskScoreSearch = useCallback(
    (request: RiskScoreRequestOptions | null) => {
      if (request == null || skip) {
        return;
      }

      const asyncSearch = async () => {
        abortCtrl.current = new AbortController();
        setLoading(true);

        searchSubscription.current = data.search
          .search<RiskScoreRequestOptions, HostsRiskScoreStrategyResponse>(request, {
            strategy: 'securitySolutionSearchStrategy',
            abortSignal: abortCtrl.current.signal,
          })
          .subscribe({
            next: (response) => {
              if (isCompleteResponse(response)) {
                const hits = response?.rawResponse?.hits?.hits;

                setRiskScoreBetterResponse((prevResponse) => ({
                  ...prevResponse,
                  data: isHostsRiskScoreHit(hits?.[0]?._source)
                    ? (hits?.map((hit) => hit._source) as HostsRiskScore[])
                    : [],
                  inspect: getInspectResponse(response, prevResponse.inspect),
                  refetch: refetch.current,
                  totalCount: response.totalCount,
                }));
                searchSubscription.current.unsubscribe();
              } else if (isErrorResponse(response)) {
                setLoading(false);
                addWarning(i18n.ERROR_RISK_SCORE);
                searchSubscription.current.unsubscribe();
              }
            },
            error: (msg) => {
              setLoading(false);
              addError(msg, { title: i18n.FAIL_RISK_SCORE });
              searchSubscription.current.unsubscribe();
            },
          });
        setLoading(false);
      };
      searchSubscription.current.unsubscribe();
      abortCtrl.current.abort();
      asyncSearch();
      refetch.current = asyncSearch;
    },
    [data.search, addError, addWarning, skip]
  );
  const [spaceId, setSpaceId] = useState<string>();

  useEffect(() => {
    if (spaces) {
      spaces.getActiveSpace().then((space) => setSpaceId(space.id));
    }
  }, [spaces]);

  useEffect(() => {
    if (spaceId) {
      setRiskScoreBetterRequest((prevRequest) => {
        const { indices, factoryQueryType, timerange } = getTransformChangesIfTheyExist({
          factoryQueryType: HostsQueries.hostsRiskScore,
          indices: [getHostRiskIndex(spaceId)],
          filterQuery,
          timerange: {
            interval: '12h',
            from: startDate,
            to: endDate,
          },
        });
        const myRequest = {
          ...(prevRequest ?? {}),
          defaultIndex: indices,
          factoryQueryType,

          docValueFields: docValueFields ?? [],
          filterQuery: createFilter(filterQuery),
          pagination: generateTablePaginationOptions(activePage, limit, true),
          timerange,
          sort,
        };

        if (!deepEqual(prevRequest, myRequest)) {
          return myRequest;
        }
        return prevRequest;
      });
    }
  }, [
    activePage,
    docValueFields,
    endDate,
    filterQuery,
    spaceId,
    limit,
    startDate,
    sort,
    getTransformChangesIfTheyExist,
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
