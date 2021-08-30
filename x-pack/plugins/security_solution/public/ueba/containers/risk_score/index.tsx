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
import { uebaModel, uebaSelectors } from '../../store';
import { generateTablePaginationOptions } from '../../../common/components/paginated_table/helpers';
import {
  RiskScoreEdges,
  PageInfoPaginated,
  DocValueFields,
  UebaQueries,
  RiskScoreRequestOptions,
  RiskScoreStrategyResponse,
} from '../../../../common';
import { ESTermQuery } from '../../../../common/typed_json';

import * as i18n from './translations';
import { isCompleteResponse, isErrorResponse } from '../../../../../../../src/plugins/data/common';
import { getInspectResponse } from '../../../helpers';
import { InspectResponse } from '../../../types';
import { useTransforms } from '../../../transforms/containers/use_transforms';
import { useAppToasts } from '../../../common/hooks/use_app_toasts';

export const ID = 'riskScoreQuery';

type LoadPage = (newActivePage: number) => void;
export interface RiskScoreState {
  data: RiskScoreEdges[];
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

interface UseRiskScore {
  docValueFields?: DocValueFields[];
  endDate: string;
  filterQuery?: ESTermQuery | string;
  indexNames: string[];
  skip?: boolean;
  startDate: string;
  type: uebaModel.UebaType;
}

export const useRiskScore = ({
  docValueFields,
  endDate,
  filterQuery,
  indexNames,
  skip = false,
  startDate,
}: UseRiskScore): [boolean, RiskScoreState] => {
  const getRiskScoreSelector = useMemo(() => uebaSelectors.riskScoreSelector(), []);
  const { activePage, limit, sort } = useDeepEqualSelector((state: State) =>
    getRiskScoreSelector(state)
  );
  const { data } = useKibana().services;
  const refetch = useRef<inputsModel.Refetch>(noop);
  const abortCtrl = useRef(new AbortController());
  const searchSubscription = useRef(new Subscription());
  const [loading, setLoading] = useState(false);
  const [riskScoreRequest, setRiskScoreRequest] = useState<RiskScoreRequestOptions | null>(null);
  const { getTransformChangesIfTheyExist } = useTransforms();
  const { addError, addWarning } = useAppToasts();

  const wrappedLoadMore = useCallback(
    (newActivePage: number) => {
      setRiskScoreRequest((prevRequest) => {
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

  const [riskScoreResponse, setRiskScoreResponse] = useState<RiskScoreState>({
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
          .search<RiskScoreRequestOptions, RiskScoreStrategyResponse>(request, {
            strategy: 'securitySolutionSearchStrategy',
            abortSignal: abortCtrl.current.signal,
          })
          .subscribe({
            next: (response) => {
              if (isCompleteResponse(response)) {
                setRiskScoreResponse((prevResponse) => ({
                  ...prevResponse,
                  data: response.edges,
                  inspect: getInspectResponse(response, prevResponse.inspect),
                  pageInfo: response.pageInfo,
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

  useEffect(() => {
    setRiskScoreRequest((prevRequest) => {
      const { indices, factoryQueryType, timerange } = getTransformChangesIfTheyExist({
        factoryQueryType: UebaQueries.riskScore,
        indices: indexNames,
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
        docValueFields: docValueFields ?? [],
        factoryQueryType,
        filterQuery: createFilter(filterQuery),
        pagination: generateTablePaginationOptions(activePage, limit),
        timerange,
        sort,
      };
      if (!deepEqual(prevRequest, myRequest)) {
        return myRequest;
      }
      return prevRequest;
    });
  }, [
    activePage,
    docValueFields,
    endDate,
    filterQuery,
    indexNames,
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
