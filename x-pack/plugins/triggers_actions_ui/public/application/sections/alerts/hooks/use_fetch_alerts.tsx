/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import type { ValidFeatureId } from '@kbn/rule-data-utils';
import { noop } from 'lodash';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Subscription } from 'rxjs';

import {
  isCompleteResponse,
  isErrorResponse,
} from '../../../../../../../../src/plugins/data/common';
import type {
  EcsFieldsResponse,
  RuleRegistrySearchRequest,
  RuleRegistrySearchResponse,
} from '../../../../../../rule_registry/common/search_strategy';
import { useKibana } from '../../../../common/lib/kibana';

interface FetchAlertsArgs {
  featureIds: ValidFeatureId[];
  query: { bool: estypes.QueryDslBoolQuery };
  pagination: {
    pageIndex: number;
    pageSize: number;
  };
  skip: boolean;
}

type AlertRequest = Omit<FetchAlertsArgs, 'featureIds' | 'skip'>;

type Refetch = () => void;

interface InspectQuery {
  request: string[];
  response: string[];
}
type GetInspectQuery = () => InspectQuery;

interface FetchAlertResp {
  alerts: EcsFieldsResponse[];
  isInitializing: boolean;
  getInspectQuery: GetInspectQuery;
  refetch: Refetch;
  totalAlerts: number;
  updatedAt: number;
}

export const useFetchAlerts = ({
  featureIds,
  query,
  pagination,
  skip,
}: FetchAlertsArgs): [boolean, FetchAlertResp] => {
  const refetch = useRef<Refetch>(noop);
  const abortCtrl = useRef(new AbortController());
  const searchSubscription$ = useRef(new Subscription());
  const [loading, setLoading] = useState(true);
  const [alertRequest, setAlertRequest] = useState<AlertRequest>({
    query,
    pagination,
  });
  const prevAlertRequest = useRef<AlertRequest | null>(null);
  const inspectQuery = useRef<InspectQuery>({
    request: [],
    response: [],
  });
  const { data } = useKibana().services;

  const getInspectQuery = useCallback(() => inspectQuery.current, []);
  const refetchGrid = useCallback(() => {
    setAlertRequest((pAlertRequest) => {
      if (pAlertRequest.pagination.pageIndex !== 0) {
        return {
          ...pAlertRequest,
          pagination: {
            ...pAlertRequest.pagination,
            pageIndex: 0,
          },
        };
      } else {
        refetch.current();
        return pAlertRequest;
      }
    });
  }, []);

  const [alertResponse, setAlertResponse] = useState<FetchAlertResp>({
    alerts: [],
    totalAlerts: -1,
    isInitializing: true,
    getInspectQuery,
    refetch: refetchGrid,
    updatedAt: 0,
  });

  const fetchAlerts = useCallback(
    (request: AlertRequest | null) => {
      if (request == null || skip) {
        return;
      }

      const asyncSearch = async () => {
        prevAlertRequest.current = request;
        abortCtrl.current = new AbortController();
        setLoading(true);
        if (data && data.search) {
          searchSubscription$.current = data.search
            .search<RuleRegistrySearchRequest, RuleRegistrySearchResponse>(
              { ...request, featureId },
              {
                strategy: 'ruleRegistryAlertsSearchStrategy',
                abortSignal: abortCtrl.current.signal,
              }
            )
            .subscribe({
              next: (response) => {
                if (isCompleteResponse(response)) {
                  const { rawResponse } = response;
                  inspectQuery.current = {
                    request: [],
                    response: [],
                  };
                  setAlertResponse((prevResponse) => {
                    const newAlertResponse = {
                      ...prevResponse,
                      alerts: rawResponse.hits.hits.map((hit) => hit.fields),
                      totalAlerts: rawResponse.hits.total,
                      isInitializing: false,
                      updatedAt: Date.now(),
                    };
                    return newAlertResponse;
                  });
                  setLoading(false);

                  searchSubscription$.current.unsubscribe();
                } else if (isErrorResponse(response)) {
                  setLoading(false);
                  data.search.addWarning(i18n.ERROR_TIMELINE_EVENTS);
                  searchSubscription$.current.unsubscribe();
                }
              },
              error: (msg) => {
                setLoading(false);
                data.search.showError(msg);
                searchSubscription$.current.unsubscribe();
              },
            });
        }
      };

      searchSubscription$.current.unsubscribe();
      abortCtrl.current.abort();
      asyncSearch();
      refetch.current = asyncSearch;
    },
    [skip, data]
  );

  return [loading, alertResponse];
};
