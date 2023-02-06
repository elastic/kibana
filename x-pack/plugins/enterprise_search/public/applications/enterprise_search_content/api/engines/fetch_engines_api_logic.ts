/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EnterpriseSearchEnginesResponse } from '../../../../../common/types/engines';
import { Page } from '../../../../../common/types/pagination';

import { createApiLogic } from '../../../shared/api_logic/create_api_logic';
import { HttpLogic } from '../../../shared/http';

export interface EnginesListAPIArguments {
  meta: Page;
  searchQuery?: string;
}

export const fetchEngines = async ({
  meta,
  searchQuery,
}: EnginesListAPIArguments): Promise<EnterpriseSearchEnginesResponse> => {
  const route = '/internal/enterprise_search/engines';
  const query = {
    from: meta.from,
    size: meta.size,
    ...(searchQuery && searchQuery.trim() !== '' ? { q: searchQuery } : {}),
  };

  const response = await HttpLogic.values.http.get<EnterpriseSearchEnginesResponse>(route, {
    query,
  });

  return { ...response, params: query };
};

export const FetchEnginesAPILogic = createApiLogic(['content', 'engines_api_logic'], fetchEngines);
