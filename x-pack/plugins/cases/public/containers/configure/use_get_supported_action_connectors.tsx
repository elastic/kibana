/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@tanstack/react-query';
import { getSupportedActionConnectors } from './api';
import { useApplicationCapabilities, useToasts } from '../../common/lib/kibana';
import * as i18n from './translations';
import { casesQueriesKeys } from '../constants';
import type { ServerError } from '../../types';
import { useCasesContext } from '../../components/cases_context/use_cases_context';

export function useGetSupportedActionConnectors() {
  const toasts = useToasts();
  const { actions } = useApplicationCapabilities();
  const { permissions } = useCasesContext();

  return useQuery(
    casesQueriesKeys.connectorsList(),
    async ({ signal }) => {
      if (!actions.read || !permissions.connectors) {
        return [];
      }
      return getSupportedActionConnectors({ signal });
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
