/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useState, useEffect, useRef } from 'react';
import { HttpSetup, IToasts } from '@kbn/core/public';
import { ActionConnector } from '../../../../common/api';
import { getIssueTypes } from './api';
import { IssueTypes } from './types';
import * as i18n from './translations';

interface Props {
  http: HttpSetup;
  toastNotifications: IToasts;
  connector?: ActionConnector;
  handleIssueType: (options: Array<{ value: string; text: string }>) => void;
}

export interface UseGetIssueTypes {
  issueTypes: IssueTypes;
  isLoading: boolean;
}

export const useGetIssueTypes = ({
  http,
  connector,
  toastNotifications,
  handleIssueType,
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
          const asOptions = (res.data ?? []).map((type) => ({
            text: type.name ?? '',
            value: type.id ?? '',
          }));

          setIssueTypes(res.data ?? []);
          handleIssueType(asOptions);
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
    // handleIssueType unmounts the component at init causing the request to be aborted
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [http, connector, toastNotifications]);

  return {
    issueTypes,
    isLoading,
  };
};
