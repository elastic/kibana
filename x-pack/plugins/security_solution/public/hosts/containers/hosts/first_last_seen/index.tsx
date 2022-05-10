/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import deepEqual from 'fast-deep-equal';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Subscription } from 'rxjs';

import { isCompleteResponse, isErrorResponse } from '@kbn/data-plugin/common';
import { useAppToasts } from '../../../../common/hooks/use_app_toasts';
import { useKibana } from '../../../../common/lib/kibana';
import {
  HostsQueries,
  HostFirstLastSeenStrategyResponse,
  HostFirstLastSeenRequestOptions,
} from '../../../../../common/search_strategy/security_solution';

import * as i18n from './translations';
import { Direction, DocValueFields } from '../../../../../common/search_strategy';

const ID = 'firstLastSeenHostQuery';

export interface FirstLastSeenHostArgs {
  id: string;
  errorMessage: string | null;
  firstSeen?: string | null;
  lastSeen?: string | null;
  order: Direction.asc | Direction.desc | null;
}
interface UseHostFirstLastSeen {
  docValueFields: DocValueFields[];
  hostName: string;
  indexNames: string[];
  order: Direction.asc | Direction.desc;
}

export const useFirstLastSeenHost = ({
  docValueFields,
  hostName,
  indexNames,
  order,
}: UseHostFirstLastSeen): [boolean, FirstLastSeenHostArgs] => {
  const { data } = useKibana().services;
  const abortCtrl = useRef(new AbortController());
  const searchSubscription$ = useRef(new Subscription());
  const [loading, setLoading] = useState(false);
  const [firstLastSeenHostRequest, setFirstLastSeenHostRequest] =
    useState<HostFirstLastSeenRequestOptions>({
      defaultIndex: indexNames,
      docValueFields: docValueFields ?? [],
      factoryQueryType: HostsQueries.firstOrLastSeen,
      hostName,
      order,
    });

  const [firstLastSeenHostResponse, setFirstLastSeenHostResponse] = useState<FirstLastSeenHostArgs>(
    {
      order: null,
      firstSeen: null,
      lastSeen: null,
      errorMessage: null,
      id: ID,
    }
  );
  const { addError, addWarning } = useAppToasts();

  const firstLastSeenHostSearch = useCallback(
    (request: HostFirstLastSeenRequestOptions) => {
      const asyncSearch = async () => {
        abortCtrl.current = new AbortController();
        setLoading(true);
        searchSubscription$.current = data.search
          .search<HostFirstLastSeenRequestOptions, HostFirstLastSeenStrategyResponse>(request, {
            strategy: 'securitySolutionSearchStrategy',
            abortSignal: abortCtrl.current.signal,
          })
          .subscribe({
            next: (response) => {
              if (isCompleteResponse(response)) {
                setLoading(false);
                setFirstLastSeenHostResponse((prevResponse) => ({
                  ...prevResponse,
                  errorMessage: null,
                  firstSeen: response.firstSeen,
                  lastSeen: response.lastSeen,
                }));
                searchSubscription$.current.unsubscribe();
              } else if (isErrorResponse(response)) {
                setLoading(false);
                addWarning(i18n.ERROR_FIRST_LAST_SEEN_HOST);
                searchSubscription$.current.unsubscribe();
              }
            },
            error: (msg) => {
              setLoading(false);
              setFirstLastSeenHostResponse((prevResponse) => ({
                ...prevResponse,
                errorMessage: msg,
              }));
              addError(msg, {
                title: i18n.FAIL_FIRST_LAST_SEEN_HOST,
              });
              searchSubscription$.current.unsubscribe();
            },
          });
      };
      searchSubscription$.current.unsubscribe();
      abortCtrl.current.abort();
      asyncSearch();
    },
    [data.search, addError, addWarning]
  );

  useEffect(() => {
    setFirstLastSeenHostRequest((prevRequest) => {
      const myRequest = {
        ...prevRequest,
        defaultIndex: indexNames,
        docValueFields: docValueFields ?? [],
        hostName,
      };
      if (!deepEqual(prevRequest, myRequest)) {
        return myRequest;
      }
      return prevRequest;
    });
  }, [indexNames, docValueFields, hostName]);

  useEffect(() => {
    firstLastSeenHostSearch(firstLastSeenHostRequest);
    return () => {
      searchSubscription$.current.unsubscribe();
      abortCtrl.current.abort();
    };
  }, [firstLastSeenHostRequest, firstLastSeenHostSearch]);

  return [loading, firstLastSeenHostResponse];
};
