/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { HttpStart } from 'src/core/public';

interface ServerSearchableTypesResponse {
  types: string[];
}

export const fetchServerSearchableTypes = async (http: HttpStart) => {
  const { types } = await http.get<ServerSearchableTypesResponse>(
    '/internal/global_search/searchable_types'
  );
  return types;
};
