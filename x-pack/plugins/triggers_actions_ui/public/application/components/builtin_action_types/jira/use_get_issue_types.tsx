/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useState, useEffect } from 'react';
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

  useEffect(() => {
    let cancel = false;
    const fetchData = async () => {
      setIsLoading(true);
      const res = await getIssueTypes({
        http,
        connectorId: actionConnector.id,
      });

      if (!cancel) {
        setIsLoading(false);
        setIssueTypes(res.data);
      }
    };
    fetchData();
    return () => {
      cancel = true;
      setIsLoading(false);
    };
  }, [http, actionConnector]);

  return {
    issueTypes,
    isLoading,
  };
};
