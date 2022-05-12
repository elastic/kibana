/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect, useState, useRef } from 'react';
import { ValidFeatureId } from '@kbn/rule-data-utils';
import { BASE_RAC_ALERTS_API_PATH } from '@kbn/rule-registry-plugin/common';

import * as i18n from './translations';
import { useHttp, useToasts } from '../common/lib/kibana';

export const useGetFeatureIds = (alertRegistrationContexts: string[]): ValidFeatureId[] => {
  const http = useHttp();
  const [alertFeatureIds, setAlertFeatureIds] = useState<ValidFeatureId[]>([]);
  const toasts = useToasts();
  const isCancelledRef = useRef(false);
  const abortCtrlRef = useRef(new AbortController());

  const fetchFeatureIds = useCallback(
    async (registrationContext: string[]) => {
      try {
        isCancelledRef.current = false;
        abortCtrlRef.current.abort();
        abortCtrlRef.current = new AbortController();

        const response = await http.get<ValidFeatureId[]>(
          `${BASE_RAC_ALERTS_API_PATH}/_feature_ids`,
          {
            signal: abortCtrlRef.current.signal,
            query: { registrationContext },
          }
        );

        if (!isCancelledRef.current) {
          setAlertFeatureIds(response);
        }
      } catch (error) {
        if (!isCancelledRef.current) {
          if (error.name !== 'AbortError') {
            toasts.addError(
              error.body && error.body.message ? new Error(error.body.message) : error,
              { title: i18n.ERROR_TITLE }
            );
          }
        }
      }
    },
    [http, toasts]
  );

  useEffect(() => {
    fetchFeatureIds(alertRegistrationContexts);
    return () => {
      isCancelledRef.current = true;
      abortCtrlRef.current.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [alertRegistrationContexts]);

  return alertFeatureIds;
};
