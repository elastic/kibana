/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@tanstack/react-query';
import { useToasts } from '../common/lib/kibana';
import { useCasesContext } from '../components/cases_context/use_cases_context';
import type { ServerError } from '../types';
import { getTags } from './api';
import { casesQueriesKeys } from './constants';
import * as i18n from './translations';

export const useGetTags = () => {
  const toasts = useToasts();
  const { owner } = useCasesContext();
  return useQuery(
    casesQueriesKeys.tags(),
    () => {
      const abortCtrl = new AbortController();
      return getTags(abortCtrl.signal, owner);
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
};
