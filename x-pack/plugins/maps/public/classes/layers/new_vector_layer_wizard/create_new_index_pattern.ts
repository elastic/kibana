/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getHttp } from '../../../kibana_services';
import { CreateDocSourceResp, INDEX_SOURCE_API_PATH } from '../../../../common';

export const createNewIndexAndPattern = async (indexName: string) => {
  return await getHttp().fetch<CreateDocSourceResp>({
    path: `/${INDEX_SOURCE_API_PATH}`,
    method: 'POST',
    body: JSON.stringify({
      index: indexName,
      // Initially set to static mappings
      mappings: {
        properties: {
          coordinates: {
            type: 'geo_shape',
          },
        },
      },
    }),
  });
};
