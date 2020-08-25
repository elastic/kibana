/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useState, useEffect } from 'react';
import { HttpSetup } from 'kibana/public';
import { ActionConnector } from '../../../../types';
import { getFieldsByIssueType } from './api';

interface Fields {
  [key: string]: {
    allowedValues: Array<{ name: string; id: string }> | [];
    defaultValue: { name: string; id: string } | {};
  };
}

interface Props {
  http: HttpSetup;
  actionConnector: ActionConnector;
  issueType: string;
}

export interface UseCreateIssueMetadata {
  fields: Fields;
  isLoading: boolean;
}

export const useGetFieldsByIssueType = ({
  http,
  actionConnector,
  issueType,
}: Props): UseCreateIssueMetadata => {
  const [isLoading, setIsLoading] = useState(true);
  const [fields, setFields] = useState<Fields>({});

  useEffect(() => {
    let cancel = false;
    const fetchData = async () => {
      if (!issueType) {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      const res = await getFieldsByIssueType({
        http,
        connectorId: actionConnector.id,
        id: issueType,
      });

      if (!cancel) {
        setIsLoading(false);
        setFields(res.data);
      }
    };

    fetchData();

    return () => {
      cancel = true;
      setIsLoading(false);
    };
  }, [http, actionConnector, issueType]);

  return {
    isLoading,
    fields,
  };
};
