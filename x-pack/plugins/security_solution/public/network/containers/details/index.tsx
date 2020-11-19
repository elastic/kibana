/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { noop } from 'lodash/fp';
import { useState, useEffect, useCallback, useRef } from 'react';
import deepEqual from 'fast-deep-equal';

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
import { isCompleteResponse, isErrorResponse } from '../../../../../../../src/plugins/data/common';
import { AbortError } from '../../../../../../../src/plugins/kibana_utils/common';
import * as i18n from './translations';
import { getInspectResponse } from '../../../helpers';
import { InspectResponse } from '../../../types';

const ID = 'networkDetailsQuery';

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
  const { data, notifications } = useKibana().services;
  const refetch = useRef<inputsModel.Refetch>(noop);
  const abortCtrl = useRef(new AbortController());
  const [loading, setLoading] = useState(false);

  const [
    networkDetailsRequest,
    setNetworkDetailsRequest,
  ] = useState<NetworkDetailsRequestOptions | null>(
    !skip
      ? {
          defaultIndex: indexNames,
          docValueFields: docValueFields ?? [],
          factoryQueryType: NetworkQueries.details,
          filterQuery: createFilter(filterQuery),
          ip,
        }
      : null
  );

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

  const networkDetailsSearch = useCallback(
    (request: NetworkDetailsRequestOptions | null) => {
      if (request == null) {
        return;
      }

      let didCancel = false;
      const asyncSearch = async () => {
        abortCtrl.current = new AbortController();
        setLoading(true);

        const searchSubscription$ = data.search
          .search<NetworkDetailsRequestOptions, NetworkDetailsStrategyResponse>(request, {
            strategy: 'securitySolutionSearchStrategy',
            abortSignal: abortCtrl.current.signal,
          })
          .subscribe({
            next: (response) => {
              if (isCompleteResponse(response)) {
                if (!didCancel) {
                  setLoading(false);
                  setNetworkDetailsResponse((prevResponse) => ({
                    ...prevResponse,
                    networkDetails: response.networkDetails,
                    inspect: getInspectResponse(response, prevResponse.inspect),
                    refetch: refetch.current,
                  }));
                }
                searchSubscription$.unsubscribe();
              } else if (isErrorResponse(response)) {
                if (!didCancel) {
                  setLoading(false);
                }
                // TODO: Make response error status clearer
                notifications.toasts.addWarning(i18n.ERROR_NETWORK_DETAILS);
                searchSubscription$.unsubscribe();
              }
            },
            error: (msg) => {
              if (!(msg instanceof AbortError)) {
                notifications.toasts.addDanger({
                  title: i18n.FAIL_NETWORK_DETAILS,
                  text: msg.message,
                });
              }
            },
          });
      };
      abortCtrl.current.abort();
      asyncSearch();
      refetch.current = asyncSearch;
      return () => {
        didCancel = true;
        abortCtrl.current.abort();
      };
    },
    [data.search, notifications.toasts]
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
      if (!skip && !deepEqual(prevRequest, myRequest)) {
        return myRequest;
      }
      return prevRequest;
    });
  }, [indexNames, filterQuery, skip, ip, docValueFields, id]);

  useEffect(() => {
    networkDetailsSearch(networkDetailsRequest);
  }, [networkDetailsRequest, networkDetailsSearch]);

  return [loading, networkDetailsResponse];
};
