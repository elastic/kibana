/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEmpty, debounce } from 'lodash/fp';
import { useState, useEffect, useRef } from 'react';
import { HttpSetup, IToasts } from '@kbn/core/public';
import { ActionConnector } from '../../../../types';
import { Issue } from './types';
import { getIssues } from './api';
import * as i18n from './translations';

interface Props {
  http: HttpSetup;
  toastNotifications: IToasts;
  actionConnector?: ActionConnector;
  query: string | null;
}

export interface UseGetIssues {
  issues: Issue[];
  isLoading: boolean;
}

export const useGetIssues = ({
  http,
  actionConnector,
  toastNotifications,
  query,
}: Props): UseGetIssues => {
  const [isLoading, setIsLoading] = useState(false);
  const [issues, setIssues] = useState<Issue[]>([]);
  const abortCtrl = useRef(new AbortController());

  useEffect(() => {
    let didCancel = false;
    const fetchData = debounce(500, async () => {
      if (!actionConnector || isEmpty(query)) {
        setIsLoading(false);
        return;
      }

      abortCtrl.current = new AbortController();
      setIsLoading(true);

      try {
        const res = await getIssues({
          http,
          signal: abortCtrl.current.signal,
          connectorId: actionConnector.id,
          title: query ?? '',
        });

        if (!didCancel) {
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
        if (!didCancel) {
          setIsLoading(false);
          toastNotifications.addDanger({
            title: i18n.ISSUES_API_ERROR,
            text: error.message,
          });
        }
      }
    });

    abortCtrl.current.abort();
    fetchData();

    return () => {
      didCancel = true;
      setIsLoading(false);
      abortCtrl.current.abort();
    };
  }, [http, actionConnector, toastNotifications, query]);

  return {
    issues,
    isLoading,
  };
};
