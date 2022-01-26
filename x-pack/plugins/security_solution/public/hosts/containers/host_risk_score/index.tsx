/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import deepEqual from 'fast-deep-equal';
import { noop } from 'lodash/fp';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Subscription } from 'rxjs';

import { inputsModel } from '../../../common/store';
import { createFilter } from '../../../common/containers/helpers';
import { useKibana } from '../../../common/lib/kibana';
import {
  HostsQueries,
  HostsRiskScoreStrategyResponse,
  getHostRiskIndex,
  HostsRiskScore,
  HostRiskScoreSortField,
  HostsRiskScoreRequestOptions,
} from '../../../../common/search_strategy';
import { ESQuery } from '../../../../common/typed_json';

import * as i18n from './translations';
import { isCompleteResponse, isErrorResponse } from '../../../../../../../src/plugins/data/common';
import { getInspectResponse } from '../../../helpers';
import { InspectResponse } from '../../../types';
import { useTransforms } from '../../../transforms/containers/use_transforms';
import { useAppToasts } from '../../../common/hooks/use_app_toasts';
import { isIndexNotFoundError } from '../../../common/utils/exceptions';

export interface HostRiskScoreState {
  data: HostsRiskScore[];
  inspect: InspectResponse;
  isInspected: boolean;
  refetch: inputsModel.Refetch;
  totalCount: number;
  isModuleEnabled: boolean | undefined;
}

interface UseHostRiskScore {
  sort?: HostRiskScoreSortField;
  filterQuery?: ESQuery | string;
  skip?: boolean;
  timerange?: { to: string; from: string };
  hostName?: string;
  onlyLatest?: boolean;
  pagination?: HostsRiskScoreRequestOptions['pagination'];
}

const isRecord = (item: unknown): item is Record<string, unknown> =>
  typeof item === 'object' && !!item;

export const isHostsRiskScoreHit = (item: Partial<HostsRiskScore>): item is HostsRiskScore =>
  isRecord(item) &&
  isRecord(item.host) &&
  typeof item.risk_stats?.risk_score === 'number' &&
  typeof item.risk === 'string';

export const useHostRiskScore = ({
  timerange,
  hostName,
  onlyLatest = true,
  filterQuery,
  sort,
  skip = false,
  pagination,
}: UseHostRiskScore): [boolean, HostRiskScoreState] => {
  const { querySize, cursorStart } = pagination || {};
  const { data, spaces } = useKibana().services;
  const refetch = useRef<inputsModel.Refetch>(noop);
  const abortCtrl = useRef(new AbortController());
  const searchSubscription = useRef(new Subscription());
  const [loading, setLoading] = useState(false);
  const [riskScoreRequest, setHostRiskScoreRequest] = useState<HostsRiskScoreRequestOptions | null>(
    null
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
    refetch: refetch.current,
    totalCount: -1,
    isModuleEnabled: undefined,
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

                setHostRiskScoreResponse((prevResponse) => ({
                  ...prevResponse,
                  data: isHostsRiskScoreHit(hits?.[0]?._source)
                    ? (hits?.map((hit) => hit._source) as HostsRiskScore[])
                    : [],
                  inspect: getInspectResponse(response, prevResponse.inspect),
                  refetch: refetch.current,
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
      setHostRiskScoreRequest((prevRequest) => {
        const myRequest = {
          ...(prevRequest ?? {}),
          defaultIndex: [getHostRiskIndex(spaceId, onlyLatest)],
          factoryQueryType: HostsQueries.hostsRiskScore,
          filterQuery: createFilter(filterQuery),
          pagination:
            cursorStart && querySize
              ? {
                  cursorStart,
                  querySize,
                }
              : undefined,
          hostNames: hostName ? [hostName] : undefined,
          timerange: timerange
            ? { to: timerange.to, from: timerange.from, interval: '' }
            : undefined,
          sort,
        };

        if (!deepEqual(prevRequest, myRequest)) {
          return myRequest;
        }
        return prevRequest;
      });
    }
  }, [
    filterQuery,
    spaceId,
    onlyLatest,
    timerange,
    cursorStart,
    querySize,
    sort,
    hostName,
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
