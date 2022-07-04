/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Meta } from '../../../../../common/types';
import { createApiLogic } from '../../../shared/api_logic/create_api_logic';
import { HttpLogic } from '../../../shared/http';
import { SearchIndex } from '../../types';

export const indicesApi = async ({ meta }: { meta: Meta }) => {
  const { http } = HttpLogic.values;
  const route = '/internal/enterprise_search/indices';
  const query = {
    page: meta.page.current,
    size: meta.page.size,
  };
  const response = await http.get<{ indices: SearchIndex[]; meta: Meta }>(route, {
    query,
  });

  return response;
};

export const IndicesAPILogic = createApiLogic(['content', 'indices_api_logic'], indicesApi);
