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
      return undefined;
    }
    throw error;
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
    // Because we cannot guarantee that the index has been refreshed and is giving us the most recent source
    // we need to fetch the source with a direct get from the index, which will always be up to date
    const result = connectorResult.hits.hits[0]?._source
      ? (await fetchConnectorById(client, connectorResult.hits.hits[0]._id))?.value
      : undefined;
    return result;
  } catch (error) {
    if (isIndexNotFoundException(error)) {
      return undefined;
    }
    throw error;
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
      return [];
    }
    throw error;
  }
};
