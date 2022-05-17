/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect, useState, useRef } from 'react';
import type { ValidFeatureId } from '@kbn/rule-data-utils';

import * as i18n from './translations';
import { useToasts } from '../common/lib/kibana';
import { getFeatureIds } from './api';

export const useGetFeatureIds = (alertRegistrationContexts: string[]): ValidFeatureId[] => {
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

        const query = { registrationContext };
        const response = await getFeatureIds(query, abortCtrlRef.current.signal);

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
    [toasts]
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
