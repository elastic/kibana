/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useState, useEffect, useRef } from 'react';
import type { HttpSetup, IToasts } from '@kbn/core/public';
import type { ActionConnector } from '../../../../common/api';
import { getIssueTypes } from './api';
import type { IssueTypes } from './types';
import * as i18n from './translations';

interface Props {
  http: HttpSetup;
  toastNotifications: IToasts;
  connector?: ActionConnector;
}

export interface UseGetIssueTypes {
  issueTypes: IssueTypes;
  isLoading: boolean;
}

export const useGetIssueTypes = ({
  http,
  connector,
  toastNotifications,
}: Props): UseGetIssueTypes => {
  const [isLoading, setIsLoading] = useState(true);
  const [issueTypes, setIssueTypes] = useState<IssueTypes>([]);
  const didCancel = useRef(false);
  const abortCtrl = useRef(new AbortController());

  useEffect(() => {
    const fetchData = async () => {
      if (!connector) {
        setIsLoading(false);
        return;
      }

      try {
        abortCtrl.current = new AbortController();
        setIsLoading(true);

        const res = await getIssueTypes({
          http,
          signal: abortCtrl.current.signal,
          connectorId: connector.id,
        });

        if (!didCancel.current) {
          setIssueTypes(res.data ?? []);
          setIsLoading(false);
          if (res.status && res.status === 'error') {
            toastNotifications.addDanger({
              title: i18n.ISSUE_TYPES_API_ERROR,
              text: `${res.serviceMessage ?? res.message}`,
            });
          }
        }
      } catch (error) {
        if (!didCancel.current) {
          setIsLoading(false);
          if (error.name !== 'AbortError') {
            toastNotifications.addDanger({
              title: i18n.ISSUE_TYPES_API_ERROR,
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
  }, [http, connector, toastNotifications]);

  return {
    issueTypes,
    isLoading,
  };
};
