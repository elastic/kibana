/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SecurityIndexPrivilege } from '@elastic/elasticsearch/lib/api/types';
import { ElasticsearchClient } from '@kbn/core-elasticsearch-server';

export const checkAnnotationsPermissions = async ({
  index,
  esClient,
}: {
  index: string;
  esClient: ElasticsearchClient;
}) => {
  return esClient.security.hasPrivileges({
    body: {
      index: [
        {
          names: [index],
          privileges: ['read', 'write'] as SecurityIndexPrivilege[],
        },
      ],
    },
  });
};
