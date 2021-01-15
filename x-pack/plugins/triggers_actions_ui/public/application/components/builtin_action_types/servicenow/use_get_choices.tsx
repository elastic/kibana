/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useState, useEffect, useRef, useMemo } from 'react';
import { HttpSetup, ToastsApi } from 'kibana/public';
import { ActionConnector } from '../../../../types';
import { getChoices } from './api';
import * as i18n from './translations';

export interface Choice {
  value: string;
  label: string;
  dependent_value: string;
}

interface Props {
  http: HttpSetup;
  toastNotifications: Pick<
    ToastsApi,
    'get$' | 'add' | 'remove' | 'addSuccess' | 'addWarning' | 'addDanger' | 'addError'
  >;
  actionConnector?: ActionConnector;
  field: string;
  onSuccess?: (choices: Choice[]) => void;
}

export interface UseGetChoices {
  choices: Choice[];
  isLoading: boolean;
}

export const useGetChoices = ({
  http,
  actionConnector,
  toastNotifications,
  field,
  onSuccess,
}: Props): UseGetChoices => {
  const [isLoading, setIsLoading] = useState(false);
  const [choices, setChoices] = useState<Choice[]>([]);
  const abortCtrl = useRef(new AbortController());
  const errorTitle = useMemo(() => i18n.CHOICES_API_ERROR(field), [field]);

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
        const res = await getChoices({
          http,
          signal: abortCtrl.current.signal,
          connectorId: actionConnector.id,
          field,
        });

        if (!didCancel) {
          setIsLoading(false);
          setChoices(res.data ?? []);
          if (res.status && res.status === 'error') {
            toastNotifications.addDanger({
              title: errorTitle,
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
            title: errorTitle,
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
  }, [http, actionConnector, toastNotifications, field, errorTitle]);

  return {
    choices,
    isLoading,
  };
};
