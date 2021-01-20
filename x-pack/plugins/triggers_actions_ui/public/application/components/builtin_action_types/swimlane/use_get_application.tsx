/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useState, useEffect, useRef } from 'react';
import { HttpSetup, ToastsApi } from 'kibana/public';
import { ActionConnector } from '../../../../types';
import { getApplication } from './api';
import * as i18n from './translations';

interface Application {
  id: string;
  fields: Field[];
}

interface Field {
  id: string;
  key: string;
}
interface Props {
  http: HttpSetup;
  toastNotifications: Pick<
    ToastsApi,
    'get$' | 'add' | 'remove' | 'addSuccess' | 'addWarning' | 'addDanger' | 'addError'
  >;
  id?: string | null;
  actionConnector?: ActionConnector;
}

export interface UseGetApplication {
  application: Application | null;
  isLoading: boolean;
}

export const useGetApplication = ({
  http,
  toastNotifications,
  actionConnector,
  id,
}: Props): UseGetApplication => {
  const [isLoading, setIsLoading] = useState(false);
  const [application, setApplication] = useState<Application | null>(null);
  const abortCtrl = useRef(new AbortController());

  // useEffect(() => {
  const didCancel = false;
  const fetchData = async () => {
    if (!actionConnector || !id) {
      setIsLoading(false);
      return;
    }

    abortCtrl.current = new AbortController();
    setIsLoading(true);
    try {
      const res = await getApplication({
        http,
        signal: abortCtrl.current.signal,
        connectorId: actionConnector.id,
        id,
      });

      if (!didCancel) {
        setIsLoading(false);
        setApplication(res.data ?? null);
        if (res.status && res.status === 'error') {
          toastNotifications.addDanger({
            title: i18n.SW_GET_APPLICATION_API_ERROR(id),
            text: `${res.serviceMessage ?? res.message}`,
          });
        }
      }
    } catch (error) {
      if (!didCancel) {
        setIsLoading(false);
        toastNotifications.addDanger({
          title: i18n.SW_GET_APPLICATION_API_ERROR(id),
          text: error.message,
        });
      }
    }
  };

  abortCtrl.current.abort();
  fetchData();

  // return () => {
  //   didCancel = true;
  //   setIsLoading(false);
  //   abortCtrl.current.abort();
  // };
  // }, [http, actionConnector, id, toastNotifications]);

  return {
    isLoading,
    application,
  };
};
