/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IScopedClusterClient } from '@kbn/core/server';

import { CONNECTORS_INDEX } from '../..';
import { ConnectorDocument } from '../../../common/types/connectors';
import { toAlphanumeric } from '../../../common/utils/to_alphanumeric';

export const generateApiKey = async (client: IScopedClusterClient, indexName: string) => {
  // removes the "search-" prefix if present, and applies the new prefix
  const aclIndexName = indexName.replace(/^(?:search-)?(.*)$/, '.search-acl-filter-$1');

  const apiKeyResult = await client.asCurrentUser.security.createApiKey({
    name: `${indexName}-connector`,
    role_descriptors: {
      [`${toAlphanumeric(indexName)}-connector-role`]: {
        cluster: ['monitor'],
        index: [
          {
            names: [indexName, aclIndexName, `${CONNECTORS_INDEX}*`],
            privileges: ['all'],
          },
        ],
      },
    },
  });
  const connectorResult = await client.asCurrentUser.search<ConnectorDocument>({
    index: CONNECTORS_INDEX,
    query: { term: { index_name: indexName } },
  });
  const connector = connectorResult.hits.hits[0];
  if (connector) {
    if (connector.fields?.api_key_id) {
      await client.asCurrentUser.security.invalidateApiKey({ id: connector.fields.api_key_id });
    }
    await client.asCurrentUser.index({
      document: { ...connector._source, api_key_id: apiKeyResult.id },
      id: connector._id,
      index: CONNECTORS_INDEX,
    });
  }
  return apiKeyResult;
};
