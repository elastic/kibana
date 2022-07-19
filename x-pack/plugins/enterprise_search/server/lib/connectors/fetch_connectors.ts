/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import { IScopedClusterClient } from '@kbn/core/server';

import { CONNECTORS_INDEX } from '../..';
import { Connector, ConnectorDocument } from '../../../common/types/connectors';
import { isNotNullish } from '../../../common/utils/is_not_nullish';
import { setupConnectorsIndices } from '../../index_management/setup_indices';

import { isIndexNotFoundException } from '../../utils/identify_exceptions';

export const fetchConnectorById = async (
  client: IScopedClusterClient,
  connectorId: string
): Promise<Connector | undefined> => {
  try {
    const connectorResult = await client.asCurrentUser.get<ConnectorDocument>({
      id: connectorId,
      index: CONNECTORS_INDEX,
    });
    return connectorResult._source
      ? { ...connectorResult._source, id: connectorResult._id }
      : undefined;
  } catch (error) {
    if (isIndexNotFoundException(error)) {
      await setupConnectorsIndices(client.asCurrentUser);
    }
    return undefined;
  }
};

export const fetchConnectorByIndexName = async (
  client: IScopedClusterClient,
  indexName: string
): Promise<Connector | undefined> => {
  try {
    const connectorResult = await client.asCurrentUser.search<ConnectorDocument>({
      index: CONNECTORS_INDEX,
      query: { term: { 'index_name.keyword': indexName } },
    });
    const result = connectorResult.hits.hits[0]?._source
      ? {
          ...connectorResult.hits.hits[0]._source,
          id: connectorResult.hits.hits[0]._id,
        }
      : undefined;
    return result;
  } catch (error) {
    if (isIndexNotFoundException(error)) {
      await setupConnectorsIndices(client.asCurrentUser);
    }
    return undefined;
  }
};

export const fetchConnectors = async (
  client: IScopedClusterClient,
  indexNames?: string[]
): Promise<Connector[]> => {
  try {
    const connectorResult = await client.asCurrentUser.search<ConnectorDocument>({
      from: 0,
      index: CONNECTORS_INDEX,
      query: { match_all: {} },
      size: 1000,
    });
    let connectors = connectorResult.hits.hits;
    let length = connectors.length;
    const query: QueryDslQueryContainer = indexNames
      ? { terms: { 'index_name.keyword': indexNames } }
      : { match_all: {} };
    while (length >= 1000) {
      const newConnectorResult = await client.asCurrentUser.search<ConnectorDocument>({
        from: 0,
        index: CONNECTORS_INDEX,
        query,
        size: 1000,
      });
      connectors = connectors.concat(newConnectorResult.hits.hits);
      length = newConnectorResult.hits.hits.length;
    }
    return connectors
      .map(({ _source, _id }) => (_source ? { ..._source, id: _id } : undefined))
      .filter(isNotNullish);
  } catch (error) {
    if (isIndexNotFoundException(error)) {
      await setupConnectorsIndices(client.asCurrentUser);
    }
    return [];
  }
};
