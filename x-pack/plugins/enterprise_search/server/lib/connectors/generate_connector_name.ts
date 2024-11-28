/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';

import { IScopedClusterClient } from '@kbn/core-elasticsearch-server';

import { ErrorCode } from '../../../common/types/error_codes';

import { toAlphanumeric } from '../../../common/utils/to_alphanumeric';
import { indexOrAliasExists } from '../indices/exists_index';
import { MANAGED_CONNECTOR_INDEX_PREFIX } from '@kbn/search-connectors';

const addIndexPrefix = (indexName: string, isManagedConnector: boolean): string => {
  const indexPrefix = isManagedConnector ? MANAGED_CONNECTOR_INDEX_PREFIX : 'connector-';
  return `${indexPrefix}${indexName}`;
};

const addConnectorPrefix = (indexName: string): string => {
  return `connector-${indexName}`;
};

export const generateConnectorName = async (
  client: IScopedClusterClient,
  connectorType: string,
  userConnectorName?: string,
  isManagedConnector: boolean = false
): Promise<{ apiKeyName: string; connectorName: string; indexName: string }> => {
  const prefix = toAlphanumeric(connectorType);
  if (!prefix || prefix.length === 0) {
    throw new Error('Connector type or connectorName is required');
  }
  if (userConnectorName) {
    let indexName = addIndexPrefix(userConnectorName, isManagedConnector);
    const resultSameName = await indexOrAliasExists(client, indexName);
    // index with same name doesn't exist
    if (!resultSameName) {
      console.log('1', indexName, isManagedConnector);
      return {
        apiKeyName: userConnectorName,
        connectorName: userConnectorName,
        indexName,
      };
    }
    // if the index name already exists, we will generate until it doesn't for 20 times
    for (let i = 0; i < 20; i++) {
      const randomizedConnectorName = `${userConnectorName}-${uuidv4().split('-')[1].slice(0, 4)}`;

      indexName = addIndexPrefix(randomizedConnectorName, isManagedConnector);

      const result = await indexOrAliasExists(client, indexName);
      if (!result) {
        console.log('2', indexName, isManagedConnector);
        return {
          apiKeyName: addConnectorPrefix(randomizedConnectorName),
          connectorName: userConnectorName,
          indexName,
        };
      }
    }
  } else {
    for (let i = 0; i < 20; i++) {
      const randomizedConnectorName = `${prefix}-${uuidv4().split('-')[1].slice(0, 4)}`;
      const indexName = addIndexPrefix(randomizedConnectorName, isManagedConnector);

      const result = await indexOrAliasExists(client, indexName);

      if (!result) {
        console.log('3', indexName);
        return {
          apiKeyName: addConnectorPrefix(randomizedConnectorName),
          connectorName: randomizedConnectorName,
          indexName,
        };
      }
    }
  }
  throw new Error(ErrorCode.GENERATE_INDEX_NAME_ERROR);
};
