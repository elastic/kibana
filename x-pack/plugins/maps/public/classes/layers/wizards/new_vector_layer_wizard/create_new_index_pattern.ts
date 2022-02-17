/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getHttp } from '../../../../kibana_services';
import { CreateDocSourceResp, IndexSourceMappings } from '../../../../../common/types';
import { INDEX_SOURCE_API_PATH } from '../../../../../common/constants';

export const createNewIndexAndPattern = async ({
  indexName,
  defaultMappings = {},
}: {
  indexName: string;
  defaultMappings: IndexSourceMappings | {};
}) => {
  return await getHttp().fetch<CreateDocSourceResp>({
    path: `/${INDEX_SOURCE_API_PATH}`,
    method: 'POST',
    body: JSON.stringify({
      index: indexName,
      mappings: {
        properties: {
          coordinates: {
            type: 'geo_shape',
          },
          ...defaultMappings,
        },
      },
    }),
  });
};
