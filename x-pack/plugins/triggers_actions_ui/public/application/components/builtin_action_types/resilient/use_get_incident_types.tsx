/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useState, useEffect, useRef } from 'react';
import { HttpSetup } from 'kibana/public';
import { ActionConnector } from '../../../../types';
import { getIncidentTypes } from './api';

type IncidentTypes = Array<{ id: string; name: string }>;

interface Props {
  http: HttpSetup;
  actionConnector: ActionConnector;
}

export interface UseGetIncidentTypes {
  incidentTypes: IncidentTypes;
  isLoading: boolean;
}

export const useGetIncidentTypes = ({ http, actionConnector }: Props): UseGetIncidentTypes => {
  const [isLoading, setIsLoading] = useState(true);
  const [incidentTypes, setIncidentTypes] = useState<IncidentTypes>([]);
  const abortCtrl = useRef(new AbortController());

  useEffect(() => {
    let didCancel = false;
    const fetchData = async () => {
      abortCtrl.current = new AbortController();
      setIsLoading(true);

      const res = await getIncidentTypes({
        http,
        signal: abortCtrl.current.signal,
        connectorId: actionConnector.id,
      });

      if (!didCancel) {
        setIsLoading(false);
        setIncidentTypes(res.data ?? []);
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
    incidentTypes,
    isLoading,
  };
};
