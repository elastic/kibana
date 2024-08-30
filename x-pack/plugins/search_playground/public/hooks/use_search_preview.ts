/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useFormContext } from 'react-hook-form';
import { APIRoutes, ChatFormFields } from '../types';
import { useKibana } from './use_kibana';

export interface UseSearchPreviewArgs {
  searchQuery: string;
}

export const useSearchPreview = () => {
  const { getValues } = useFormContext();
  const { services } = useKibana();
  const { http } = services;

  return async ({ searchQuery }: UseSearchPreviewArgs) => {
    const body = JSON.stringify({
      search_query: searchQuery,
      elasticsearch_query: JSON.stringify(getValues(ChatFormFields.elasticsearchQuery)),
      indices: getValues(ChatFormFields.indices),
      source_fields: JSON.stringify(getValues(ChatFormFields.sourceFields)),
    });
    console.log(body);
    await http.post(APIRoutes.POST_SEARCH_QUERY, {
      body,
    });
  };
};
