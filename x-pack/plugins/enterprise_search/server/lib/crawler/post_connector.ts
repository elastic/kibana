/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IScopedClusterClient } from '@kbn/core-elasticsearch-server';

import { createConnectorDocument, CONNECTORS_INDEX, ConnectorStatus } from '@kbn/search-connectors';

import { ENTERPRISE_SEARCH_CONNECTOR_CRAWLER_SERVICE_TYPE } from '../../../common/constants';
import { stripSearchPrefix } from '../../../common/utils/strip_search_prefix';

export const recreateConnectorDocument = async (
  client: IScopedClusterClient,
  indexName: string
) => {
  const document = createConnectorDocument({
    indexName,
    isNative: false,
    // The search index has already been created so we don't need the language, which we can't retrieve anymore anyway
    language: '',
    name: stripSearchPrefix(indexName),
    pipeline: null,
    serviceType: ENTERPRISE_SEARCH_CONNECTOR_CRAWLER_SERVICE_TYPE,
  });
  const result = await client.asCurrentUser.index({
    document: { ...document, status: ConnectorStatus.CONFIGURED },
    index: CONNECTORS_INDEX,
    refresh: 'wait_for',
  });
  return result._id;
};
