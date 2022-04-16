/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { noop } from 'lodash/fp';
import { useState, useEffect, useCallback, useRef } from 'react';
import deepEqual from 'fast-deep-equal';
import { Subscription } from 'rxjs';

import { isCompleteResponse, isErrorResponse } from '@kbn/data-plugin/common';
import { ESTermQuery } from '../../../../common/typed_json';
import { inputsModel } from '../../../common/store';
import { useKibana } from '../../../common/lib/kibana';
import { createFilter } from '../../../common/containers/helpers';
import {
  DocValueFields,
  NetworkQueries,
  NetworkDetailsRequestOptions,
  NetworkDetailsStrategyResponse,
} from '../../../../common/search_strategy';
import * as i18n from './translations';
import { getInspectResponse } from '../../../helpers';
import { InspectResponse } from '../../../types';
import { useAppToasts } from '../../../common/hooks/use_app_toasts';

export const ID = 'networkDetailsQuery';

export interface NetworkDetailsArgs {
  id: string;
  inspect: InspectResponse;
  networkDetails: NetworkDetailsStrategyResponse['networkDetails'];
  refetch: inputsModel.Refetch;
  isInspected: boolean;
}

interface UseNetworkDetails {
  id?: string;
  docValueFields: DocValueFields[];
  ip: string;
  indexNames: string[];
  filterQuery?: ESTermQuery | string;
  skip: boolean;
}

export const useNetworkDetails = ({
  docValueFields,
  filterQuery,
  indexNames,
  id = ID,
  skip,
  ip,
}: UseNetworkDetails): [boolean, NetworkDetailsArgs] => {
  const { data } = useKibana().services;
  const refetch = useRef<inputsModel.Refetch>(noop);
  const abortCtrl = useRef(new AbortController());
  const searchSubscription$ = useRef(new Subscription());
  const [loading, setLoading] = useState(false);

  const [networkDetailsRequest, setNetworkDetailsRequest] =
    useState<NetworkDetailsRequestOptions | null>(null);

  const [networkDetailsResponse, setNetworkDetailsResponse] = useState<NetworkDetailsArgs>({
    networkDetails: {},
    id,
    inspect: {
      dsl: [],
      response: [],
    },
    isInspected: false,
    refetch: refetch.current,
  });
  const { addError, addWarning } = useAppToasts();

  const networkDetailsSearch = useCallback(
    (request: NetworkDetailsRequestOptions | null) => {
      if (request == null || skip) {
        return;
      }
      const asyncSearch = async () => {
        abortCtrl.current = new AbortController();
        setLoading(true);
        searchSubscription$.current = data.search
          .search<NetworkDetailsRequestOptions, NetworkDetailsStrategyResponse>(request, {
            strategy: 'securitySolutionSearchStrategy',
            abortSignal: abortCtrl.current.signal,
          })
          .subscribe({
            next: (response) => {
              if (isCompleteResponse(response)) {
                setLoading(false);
                setNetworkDetailsResponse((prevResponse) => ({
                  ...prevResponse,
                  networkDetails: response.networkDetails,
                  inspect: getInspectResponse(response, prevResponse.inspect),
                  refetch: refetch.current,
                }));
                searchSubscription$.current.unsubscribe();
              } else if (isErrorResponse(response)) {
                setLoading(false);
                addWarning(i18n.ERROR_NETWORK_DETAILS);
                searchSubscription$.current.unsubscribe();
              }
            },
            error: (msg) => {
              setLoading(false);
              addError(msg, {
                title: i18n.FAIL_NETWORK_DETAILS,
              });
              searchSubscription$.current.unsubscribe();
            },
          });
      };
      searchSubscription$.current.unsubscribe();
      abortCtrl.current.abort();
      asyncSearch();
      refetch.current = asyncSearch;
    },
    [data.search, addError, addWarning, skip]
  );

  useEffect(() => {
    setNetworkDetailsRequest((prevRequest) => {
      const myRequest = {
        ...(prevRequest ?? {}),
        defaultIndex: indexNames,
        docValueFields: docValueFields ?? [],
        factoryQueryType: NetworkQueries.details,
        filterQuery: createFilter(filterQuery),
        ip,
      };
      if (!deepEqual(prevRequest, myRequest)) {
        return myRequest;
      }
      return prevRequest;
    });
  }, [indexNames, filterQuery, ip, docValueFields, id]);

  useEffect(() => {
    networkDetailsSearch(networkDetailsRequest);
    return () => {
      searchSubscription$.current.unsubscribe();
      abortCtrl.current.abort();
    };
  }, [networkDetailsRequest, networkDetailsSearch]);

  return [loading, networkDetailsResponse];
};
