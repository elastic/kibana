/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { HttpStart } from '@kbn/core/public';

interface ServerSearchableTypesResponse {
  types: string[];
}

export const fetchServerSearchableTypes = async (http: HttpStart) => {
  const { types } = await http.get<ServerSearchableTypesResponse>(
    '/internal/global_search/searchable_types'
  );
  return types;
};
