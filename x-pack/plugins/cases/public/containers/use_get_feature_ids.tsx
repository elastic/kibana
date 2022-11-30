/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@tanstack/react-query';
import type { ValidFeatureId } from '@kbn/rule-data-utils';
import type { ServerError } from '../types';
import { useToasts } from '../common/lib/kibana';
import * as i18n from './translations';
import { getFeatureIds } from './api';
import { casesQueriesKeys } from './constants';

export const useGetFeatureIds = (alertRegistrationContexts: string[]) => {
  const toasts = useToasts();
  return useQuery<ValidFeatureId[], ServerError>(
    casesQueriesKeys.featureIds(alertRegistrationContexts),
    () => {
      const abortCtrlRef = new AbortController();
      const query = { registrationContext: alertRegistrationContexts };
      return getFeatureIds(query, abortCtrlRef.signal);
    },
    {
      onError: (error: ServerError) => {
        if (error.name !== 'AbortError') {
          toasts.addError(
            error.body && error.body.message ? new Error(error.body.message) : error,
            {
              title: i18n.ERROR_TITLE,
            }
          );
        }
      },
    }
  );
};

export type UseGetFeatureIds = typeof useGetFeatureIds;
