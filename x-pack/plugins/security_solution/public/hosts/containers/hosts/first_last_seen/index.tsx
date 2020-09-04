/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import deepEqual from 'fast-deep-equal';
import { useCallback, useEffect, useRef, useState } from 'react';

import { DEFAULT_INDEX_KEY } from '../../../../../common/constants';

import { useKibana } from '../../../../common/lib/kibana';
import {
  HostsQueries,
  HostFirstLastSeenRequestOptions,
  HostFirstLastSeenStrategyResponse,
} from '../../../../../common/search_strategy/security_solution';
import { useWithSource } from '../../../../common/containers/source';

import * as i18n from './translations';
import { AbortError } from '../../../../../../../../src/plugins/data/common';

const ID = 'firstLastSeenHostQuery';

export interface FirstLastSeenHostArgs {
  id: string;
  errorMessage: string | null;
  firstSeen?: string | null;
  lastSeen?: string | null;
}
interface UseHostFirstLastSeen {
  hostName: string;
}

export const useFirstLastSeenHost = ({
  hostName,
}: UseHostFirstLastSeen): [boolean, FirstLastSeenHostArgs] => {
  const { docValueFields } = useWithSource('default');
  const { data, notifications, uiSettings } = useKibana().services;
  const abortCtrl = useRef(new AbortController());
  const defaultIndex = uiSettings.get<string[]>(DEFAULT_INDEX_KEY);
  const [loading, setLoading] = useState(false);
  const [firstLastSeenHostRequest, setFirstLastSeenHostRequest] = useState<
    HostFirstLastSeenRequestOptions
  >({
    defaultIndex,
    docValueFields: docValueFields ?? [],
    factoryQueryType: HostsQueries.firstLastSeen,
    hostName,
  });

  const [firstLastSeenHostResponse, setFirstLastSeenHostResponse] = useState<FirstLastSeenHostArgs>(
    {
      firstSeen: null,
      lastSeen: null,
      errorMessage: null,
      id: ID,
    }
  );

  const firstLastSeenHostSearch = useCallback(
    (request: HostFirstLastSeenRequestOptions) => {
      let didCancel = false;
      const asyncSearch = async () => {
        abortCtrl.current = new AbortController();
        setLoading(true);

        const searchSubscription$ = data.search
          .search<HostFirstLastSeenRequestOptions, HostFirstLastSeenStrategyResponse>(request, {
            strategy: 'securitySolutionSearchStrategy',
            abortSignal: abortCtrl.current.signal,
          })
          .subscribe({
            next: (response) => {
              if (!response.isPartial && !response.isRunning) {
                if (!didCancel) {
                  setLoading(false);
                  setFirstLastSeenHostResponse((prevResponse) => ({
                    ...prevResponse,
                    errorMessage: null,
                    firstSeen: response.firstSeen,
                    lastSeen: response.lastSeen,
                  }));
                }
                searchSubscription$.unsubscribe();
              } else if (response.isPartial && !response.isRunning) {
                if (!didCancel) {
                  setLoading(false);
                }
                // TODO: Make response error status clearer
                notifications.toasts.addWarning(i18n.ERROR_FIRST_LAST_SEEN_HOST);
                searchSubscription$.unsubscribe();
              }
            },
            error: (msg) => {
              if (!(msg instanceof AbortError)) {
                setFirstLastSeenHostResponse((prevResponse) => ({
                  ...prevResponse,
                  errorMessage: msg,
                }));
                notifications.toasts.addDanger({
                  title: i18n.FAIL_FIRST_LAST_SEEN_HOST,
                  text: msg.message,
                });
              }
            },
          });
      };
      abortCtrl.current.abort();
      asyncSearch();
      return () => {
        didCancel = true;
        abortCtrl.current.abort();
      };
    },
    [data.search, notifications.toasts]
  );

  useEffect(() => {
    setFirstLastSeenHostRequest((prevRequest) => {
      const myRequest = {
        ...prevRequest,
        defaultIndex,
        docValueFields: docValueFields ?? [],
        hostName,
      };
      if (!deepEqual(prevRequest, myRequest)) {
        return myRequest;
      }
      return prevRequest;
    });
  }, [defaultIndex, docValueFields, hostName]);

  useEffect(() => {
    firstLastSeenHostSearch(firstLastSeenHostRequest);
  }, [firstLastSeenHostRequest, firstLastSeenHostSearch]);

  return [loading, firstLastSeenHostResponse];
};
