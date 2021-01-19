/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useState, useEffect, useRef, useMemo } from 'react';
import { HttpSetup, ToastsApi } from 'kibana/public';
import { ActionConnector } from '../../../containers/types';
import { getChoices } from './api';
import { Choice } from './types';
import * as i18n from './translations';

export interface UseGetChoicesProps {
  http: HttpSetup;
  toastNotifications: Pick<
    ToastsApi,
    'get$' | 'add' | 'remove' | 'addSuccess' | 'addWarning' | 'addDanger' | 'addError'
  >;
  connector?: ActionConnector;
  fields: string[];
  onSuccess?: (choices: Choice[]) => void;
}

export interface UseGetChoices {
  choices: Choice[];
  isLoading: boolean;
}

export const useGetChoices = ({
  http,
  connector,
  toastNotifications,
  fields,
  onSuccess,
}: UseGetChoicesProps): UseGetChoices => {
  const [isLoading, setIsLoading] = useState(false);
  const [choices, setChoices] = useState<Choice[]>([]);
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
        const res = await getChoices({
          http,
          signal: abortCtrl.current.signal,
          connectorId: connector.id,
          fields,
        });

        if (!didCancel) {
          setIsLoading(false);
          setChoices(res.data ?? []);
          if (res.status && res.status === 'error') {
            toastNotifications.addDanger({
              title: i18n.CHOICES_API_ERROR,
              text: `${res.serviceMessage ?? res.message}`,
            });
          } else if (onSuccess) {
            onSuccess(res.data ?? []);
          }
        }
      } catch (error) {
        if (!didCancel) {
          setIsLoading(false);
          toastNotifications.addDanger({
            title: i18n.CHOICES_API_ERROR,
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [http, connector, toastNotifications, fields]);

  return {
    choices,
    isLoading,
  };
};
