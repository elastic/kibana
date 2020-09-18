/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useState, useEffect, useRef } from 'react';
import { HttpSetup, ToastsApi } from 'kibana/public';
import { ActionConnector } from '../../../containers/types';
import { getIssueTypes } from './api';
import { IssueTypes } from './types';
import * as i18n from './translations';

interface Props {
  http: HttpSetup;
  toastNotifications: Pick<
    ToastsApi,
    'get$' | 'add' | 'remove' | 'addSuccess' | 'addWarning' | 'addDanger' | 'addError'
  >;
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
  const abortCtrl = useRef(new AbortController());

  useEffect(() => {
    let didCancel = false;
    const fetchData = async () => {
      if (!connector) {
        setIsLoading(false);
        return;
      }

      abortCtrl.current = new AbortController();
      setIsLoading(true);

      try {
        const res = await getIssueTypes({
          http,
          signal: abortCtrl.current.signal,
          connectorId: connector.id,
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
  }, [http, connector, toastNotifications]);

  return {
    issueTypes,
    isLoading,
  };
};
