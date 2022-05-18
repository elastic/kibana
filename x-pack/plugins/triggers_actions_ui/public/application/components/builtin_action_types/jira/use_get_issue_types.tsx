/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useState, useEffect, useRef } from 'react';
import { HttpSetup, IToasts } from '@kbn/core/public';

import { ActionConnector } from '../../../../types';
import { IssueTypes } from './types';
import { getIssueTypes } from './api';
import * as i18n from './translations';

interface Props {
  http: HttpSetup;
  toastNotifications: IToasts;
  actionConnector?: ActionConnector;
}

export interface UseGetIssueTypes {
  issueTypes: IssueTypes;
  isLoading: boolean;
}

export const useGetIssueTypes = ({
  http,
  actionConnector,
  toastNotifications,
}: Props): UseGetIssueTypes => {
  const [isLoading, setIsLoading] = useState(true);
  const [issueTypes, setIssueTypes] = useState<IssueTypes>([]);
  const abortCtrl = useRef(new AbortController());

  useEffect(() => {
    let didCancel = false;
    const fetchData = async () => {
      if (!actionConnector) {
        setIsLoading(false);
        return;
      }

      abortCtrl.current = new AbortController();
      setIsLoading(true);

      try {
        const res = await getIssueTypes({
          http,
          signal: abortCtrl.current.signal,
          connectorId: actionConnector.id,
        });

        if (!didCancel) {
          setIsLoading(false);
          setIssueTypes(res.data ?? []);
          if (res.status && res.status === 'error') {
            toastNotifications.addDanger({
              title: i18n.ISSUE_TYPES_API_ERROR,
              text: `${res.serviceMessage ?? res.message}`,
            });
          }
        }
      } catch (error) {
        if (!didCancel) {
          setIsLoading(false);
          toastNotifications.addDanger({
            title: i18n.ISSUE_TYPES_API_ERROR,
            text: error.message,
          });
        }
      }
    };

    abortCtrl.current.abort();
    fetchData();

    return () => {
      didCancel = true;
      setIsLoading(false);
      abortCtrl.current.abort();
    };
  }, [http, actionConnector, toastNotifications]);

  return {
    issueTypes,
    isLoading,
  };
};
