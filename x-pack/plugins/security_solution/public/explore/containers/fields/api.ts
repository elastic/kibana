/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { KibanaServices } from '../../../common/lib/kibana';
import { FIELDS_IN_INDEX_API_URL } from '../../../../common/constants';

export const getIsFieldInIndexPattern = async (params: {
  query: {
    indexName: string;
    fields: string[];
  };
  signal?: AbortSignal;
}): Promise<{
  isDeprecated: boolean;
  isEnabled: boolean;
}> => {
  const { indexName, fields } = params.query;
  return KibanaServices.get().http.fetch<{ isDeprecated: boolean; isEnabled: boolean }>(
    FIELDS_IN_INDEX_API_URL,
    {
      method: 'GET',
      query: { indexName, fields },
      asSystemRequest: true,
      signal: params.signal,
    }
  );
};
