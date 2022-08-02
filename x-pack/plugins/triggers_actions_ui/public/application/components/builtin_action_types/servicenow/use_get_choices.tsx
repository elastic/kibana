/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { HttpSetup, IToasts } from '@kbn/core/public';
import { ActionConnector } from '../../../../types';
import { getChoices } from './api';
import { Choice } from './types';
import * as i18n from './translations';

export interface UseGetChoicesProps {
  http: HttpSetup;
  toastNotifications: IToasts;
  actionConnector?: ActionConnector;
  fields: string[];
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
  fields,
  onSuccess,
}: UseGetChoicesProps): UseGetChoices => {
  const [isLoading, setIsLoading] = useState(false);
  const [choices, setChoices] = useState<Choice[]>([]);
  const didCancel = useRef(false);
  const abortCtrl = useRef(new AbortController());

  const fetchData = useCallback(async () => {
    if (!actionConnector) {
      setIsLoading(false);
      return;
    }

    try {
      didCancel.current = false;
      abortCtrl.current.abort();
      abortCtrl.current = new AbortController();
      setIsLoading(true);

      const res = await getChoices({
        http,
        signal: abortCtrl.current.signal,
        connectorId: actionConnector.id,
        fields,
      });

      if (!didCancel.current) {
        const data = Array.isArray(res.data) ? res.data : [];
        setIsLoading(false);
        setChoices(data);
        if (res.status && res.status === 'error') {
          toastNotifications.addDanger({
            title: i18n.CHOICES_API_ERROR,
            text: `${res.serviceMessage ?? res.message}`,
          });
        } else if (onSuccess) {
          onSuccess(data);
        }
      }
    } catch (error) {
      if (!didCancel.current) {
        setIsLoading(false);
        toastNotifications.addDanger({
          title: i18n.CHOICES_API_ERROR,
          text: error.message,
        });
      }
    }
  }, [actionConnector, http, fields, onSuccess, toastNotifications]);

  useEffect(() => {
    fetchData();

    return () => {
      didCancel.current = true;
      abortCtrl.current.abort();
      setIsLoading(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    choices,
    isLoading,
  };
};
