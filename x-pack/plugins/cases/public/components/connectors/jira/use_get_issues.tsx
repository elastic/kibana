/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEmpty, debounce } from 'lodash/fp';
import { useState, useEffect, useRef } from 'react';
import { HttpSetup, ToastsApi } from 'kibana/public';
import { ActionConnector } from '../../../../common/api';
import { getIssues } from './api';
import { Issues } from './types';
import * as i18n from './translations';

interface Props {
  http: HttpSetup;
  toastNotifications: Pick<
    ToastsApi,
    'get$' | 'add' | 'remove' | 'addSuccess' | 'addWarning' | 'addDanger' | 'addError'
  >;
  actionConnector?: ActionConnector;
  query: string | null;
}

export interface UseGetIssues {
  issues: Issues;
  isLoading: boolean;
}

export const useGetIssues = ({
  http,
  actionConnector,
  toastNotifications,
  query,
}: Props): UseGetIssues => {
  const [isLoading, setIsLoading] = useState(false);
  const [issues, setIssues] = useState<Issues>([]);
  const didCancel = useRef(false);
  const abortCtrl = useRef(new AbortController());

  useEffect(() => {
    const fetchData = debounce(500, async () => {
      if (!actionConnector || isEmpty(query)) {
        setIsLoading(false);
        return;
      }

      try {
        abortCtrl.current = new AbortController();
        setIsLoading(true);

        const res = await getIssues({
          http,
          signal: abortCtrl.current.signal,
          connectorId: actionConnector.id,
          title: query ?? '',
        });

        if (!didCancel.current) {
          setIsLoading(false);
          setIssues(res.data ?? []);
          if (res.status && res.status === 'error') {
            toastNotifications.addDanger({
              title: i18n.ISSUES_API_ERROR,
              text: `${res.serviceMessage ?? res.message}`,
            });
          }
        }
      } catch (error) {
        if (!didCancel.current) {
          setIsLoading(false);
          if (error.name !== 'AbortError') {
            toastNotifications.addDanger({
              title: i18n.ISSUES_API_ERROR,
              text: error.message,
            });
          }
        }
      }
    });

    didCancel.current = false;
    abortCtrl.current.abort();
    fetchData();

    return () => {
      didCancel.current = true;
      abortCtrl.current.abort();
    };
  }, [http, actionConnector, toastNotifications, query]);

  return {
    issues,
    isLoading,
  };
};
