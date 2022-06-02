/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from 'react-query';
import { fetchConnectors } from './api';
import { useApplicationCapabilities, useToasts } from '../../common/lib/kibana';
import * as i18n from './translations';
import { CASE_CONNECTORS_CACHE_KEY } from '../constants';
import { ServerError } from '../../types';

export function useGetConnectors() {
  const toasts = useToasts();
  const { actions } = useApplicationCapabilities();
  return useQuery(
    [CASE_CONNECTORS_CACHE_KEY],
    async () => {
      if (!actions.read) {
        return [];
      }
      const abortCtrl = new AbortController();
      return fetchConnectors({ signal: abortCtrl.signal });
    },
    {
      onError: (error: ServerError) => {
        if (error.name !== 'AbortError') {
          toasts.addError(
            error.body && error.body.message ? new Error(error.body.message) : error,
            { title: i18n.ERROR_TITLE }
          );
        }
      },
    }
  );
}
