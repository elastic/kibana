/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useState, useEffect, useRef } from 'react';
import { HttpSetup, IToasts } from '@kbn/core/public';
import { ActionConnector } from '../../../../common/api';
import { getChoices } from './api';
import { Choice } from './types';
import * as i18n from './translations';

export interface UseGetChoicesProps {
  http: HttpSetup;
  toastNotifications: IToasts;
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

        const res = await getChoices({
          http,
          signal: abortCtrl.current.signal,
          connectorId: connector.id,
          fields,
        });

        if (!didCancel.current) {
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
        if (!didCancel.current) {
          setIsLoading(false);
          if (error.name !== 'AbortError') {
            toastNotifications.addDanger({
              title: i18n.CHOICES_API_ERROR,
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [http, connector, toastNotifications, fields]);

  return {
    choices,
    isLoading,
  };
};
