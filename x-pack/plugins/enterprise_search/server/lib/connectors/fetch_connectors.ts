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
import { OptimisticConcurrency } from '../../../common/types/util_types';
import { setupConnectorsIndices } from '../../index_management/setup_indices';

import { isIndexNotFoundException } from '../../utils/identify_exceptions';
import { fetchAll } from '../fetch_all';

export const fetchConnectorById = async (
  client: IScopedClusterClient,
  connectorId: string
): Promise<OptimisticConcurrency<Connector> | undefined> => {
  try {
    const connectorResult = await client.asCurrentUser.get<ConnectorDocument>({
      id: connectorId,
      index: CONNECTORS_INDEX,
    });
    return connectorResult._source
      ? {
          primaryTerm: connectorResult._primary_term,
          seqNo: connectorResult._seq_no,
          value: { ...connectorResult._source, id: connectorResult._id },
        }
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
      query: { term: { index_name: indexName } },
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
  const query: QueryDslQueryContainer = indexNames
    ? { terms: { index_name: indexNames } }
    : { match_all: {} };

  try {
    return await fetchAll<Connector>(client, CONNECTORS_INDEX, query);
  } catch (error) {
    if (isIndexNotFoundException(error)) {
      await setupConnectorsIndices(client.asCurrentUser);
    }
    return [];
  }
};
