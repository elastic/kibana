/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@tanstack/react-query';
import { useCasesToast } from '../common/use_cases_toast';
import { useCasesContext } from '../components/cases_context/use_cases_context';
import type { ServerError } from '../types';
import { getCategories } from './api';
import { casesQueriesKeys } from './constants';
import * as i18n from './translations';

export const useGetCategories = () => {
  const { showErrorToast } = useCasesToast();
  const { owner } = useCasesContext();

  return useQuery(casesQueriesKeys.categories(), ({ signal }) => getCategories({ owner, signal }), {
    onError: (error: ServerError) => {
      showErrorToast(error, { title: i18n.CATEGORIES_ERROR_TITLE });
    },
    staleTime: 60 * 1000, // one minute
  });
};
