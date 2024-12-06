/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';

export const logSearchRequest = (searchRequest: estypes.SearchRequest): string => {
  // handle deprecated body property which still used widely across Detection Engine
  if (searchRequest.body) {
    const { body, runtime_mappings: _, index, ...params } = searchRequest;
    const urlParams = Object.entries(params)
      .reduce<string[]>((acc, [key, value]) => {
        if (value) {
          acc.push(`${key}=${value}`);
        }

        return acc;
      }, [])
      .join('&');
    return `POST /${index}/_search?${urlParams}\n${JSON.stringify(searchRequest.body, null, 2)}`;
  }

  return '???';
};
