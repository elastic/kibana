/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useState, useEffect, useRef } from 'react';
import { HttpSetup } from 'kibana/public';
import { ActionConnector } from '../../../../types';
import { getIssueTypes } from './api';

type IssueTypes = Array<{ id: string; name: string }>;

interface Props {
  http: HttpSetup;
  actionConnector: ActionConnector;
}

export interface UseCreateIssueMetadata {
  issueTypes: IssueTypes;
  isLoading: boolean;
}

export const useGetIssueTypes = ({ http, actionConnector }: Props): UseCreateIssueMetadata => {
  const [isLoading, setIsLoading] = useState(true);
  const [issueTypes, setIssueTypes] = useState<IssueTypes>([]);
  const abortCtrl = useRef(new AbortController());

  useEffect(() => {
    let didCancel = false;
    const fetchData = async () => {
      abortCtrl.current = new AbortController();
      setIsLoading(true);

      const res = await getIssueTypes({
        http,
        signal: abortCtrl.current.signal,
        connectorId: actionConnector.id,
      });

      if (!didCancel) {
        setIsLoading(false);
        setIssueTypes(res.data);
      }
    };

    abortCtrl.current.abort();
    fetchData();

    return () => {
      didCancel = true;
      setIsLoading(false);
      abortCtrl.current.abort();
    };
  }, [http, actionConnector]);

  return {
    issueTypes,
    isLoading,
  };
};
