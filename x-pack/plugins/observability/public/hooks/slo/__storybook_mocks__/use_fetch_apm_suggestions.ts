/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Params, UseFetchApmSuggestions } from '../use_fetch_apm_suggestions';

export const useFetchApmSuggestions = ({
  fieldName,
  search = '',
  serviceName = '',
}: Params): UseFetchApmSuggestions => {
  return {
    isLoading: false,
    isError: false,
    isSuccess: true,
    suggestions: ['apm-suggestion-1', 'apm-suggestion-2', 'apm-suggestion-3'],
  };
};
