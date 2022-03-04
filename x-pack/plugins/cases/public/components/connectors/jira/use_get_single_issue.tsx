/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useState, useEffect, useRef } from 'react';
import { HttpSetup, ToastsApi } from 'kibana/public';
import { ActionConnector } from '../../../../common/api';
import { getIssue } from './api';
import { Issue } from './types';
import * as i18n from './translations';

interface Props {
  http: HttpSetup;
  toastNotifications: Pick<
    ToastsApi,
    'get$' | 'add' | 'remove' | 'addSuccess' | 'addWarning' | 'addDanger' | 'addError'
  >;
  id: string | null;
  actionConnector?: ActionConnector;
}

export interface UseGetSingleIssue {
  issue: Issue | null;
  isLoading: boolean;
}

export const useGetSingleIssue = ({
  http,
  toastNotifications,
  actionConnector,
  id,
}: Props): UseGetSingleIssue => {
  const [isLoading, setIsLoading] = useState(false);
  const [issue, setIssue] = useState<Issue | null>(null);
  const didCancel = useRef(false);
  const abortCtrl = useRef(new AbortController());

  useEffect(() => {
    const fetchData = async () => {
      if (!actionConnector || !id) {
        setIsLoading(false);
        return;
      }

      abortCtrl.current = new AbortController();
      setIsLoading(true);
      try {
        const res = await getIssue({
          http,
          signal: abortCtrl.current.signal,
          connectorId: actionConnector.id,
          id,
        });

        if (!didCancel.current) {
          setIsLoading(false);
          setIssue(res.data ?? null);
          if (res.status && res.status === 'error') {
            toastNotifications.addDanger({
              title: i18n.GET_ISSUE_API_ERROR(id),
              text: `${res.serviceMessage ?? res.message}`,
            });
          }
        }
      } catch (error) {
        if (!didCancel.current) {
          setIsLoading(false);
          if (error.name !== 'AbortError') {
            toastNotifications.addDanger({
              title: i18n.GET_ISSUE_API_ERROR(id),
              text: error.message,
            });
          }
        }
      }
    };

    didCancel.current = false;
    abortCtrl.current.abort();
    fetchData();

    return () => {
      didCancel.current = true;
      abortCtrl.current.abort();
    };
  }, [http, actionConnector, id, toastNotifications]);

  return {
    isLoading,
    issue,
  };
};
