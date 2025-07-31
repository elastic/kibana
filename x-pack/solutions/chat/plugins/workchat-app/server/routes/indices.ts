/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RouteDependencies } from './types';

export const registerIndicesRoutes = ({ router, getServices, logger }: RouteDependencies) => {
  router.get(
    {
      path: '/internal/workchat_app/indices',
      validate: {},
      security: {
        authz: {
          enabled: false,
          reason: 'Internal API for listing Elasticsearch indices',
        },
      },
    },
    async (context, request, response) => {
      logger.info('IndicesAPI: GET /internal/workchat_app/indices called');

      try {
        const core = await context.core;
        const esClient = core.elasticsearch.client.asCurrentUser;

        logger.info('IndicesAPI: Fetching indices from Elasticsearch');

        // Get all indices
        const indicesResponse = await esClient.cat.indices({
          format: 'json',
          h: ['index', 'docs.count', 'store.size', 'health', 'status'],
        });

        logger.info(`IndicesAPI: Found ${indicesResponse.length} indices`);

        // Get connector clients to check for attached indices
        let connectorClients: any[] = [];
        try {
          const connectorsResponse = await esClient.search({
            index: '.elastic-connectors',
            size: 100,
            ignore_unavailable: true,
          });
          connectorClients = connectorsResponse.hits?.hits || [];
          logger.info(`IndicesAPI: Found ${connectorClients.length} connector clients`);
        } catch (connectorError) {
          logger.warn(
            'IndicesAPI: Could not fetch connector clients (index may not exist):',
            connectorError
          );
        }

        // Create a map of connector indices
        const connectorIndexMap = new Map();
        connectorClients.forEach((connector) => {
          const source = connector._source;
          if (source?.index_name) {
            connectorIndexMap.set(source.index_name, {
              id: connector._id,
              name: source.name || 'Unnamed Connector',
              service_type: source.service_type || 'unknown',
              status: source.status || 'unknown',
            });
          }
        });

        // Get mappings for all indices to detect vector/semantic fields
        const allIndicesNames = indicesResponse
          .map((index) => index.index)
          .filter((name) => name && !name.startsWith('.') && !name.startsWith('kibana')); // Filter out system indices

        const mappingsResponse = await esClient.indices.getMapping({
          index: allIndicesNames.length > 0 ? allIndicesNames.join(',') : '_none',
          ignore_unavailable: true,
        });

        logger.info(
          `IndicesAPI: Retrieved mappings for ${Object.keys(mappingsResponse).length} indices`
        );

        // Process indices and detect capabilities
        const processedIndices = indicesResponse
          .filter(
            (index) =>
              index.index && !index.index.startsWith('.') && !index.index.startsWith('kibana')
          )
          .map((index) => {
            const indexName = index.index!;
            const mapping = mappingsResponse[indexName]?.mappings?.properties || {};
            const connectorInfo = connectorIndexMap.get(indexName);

            // Detect search capabilities
            const capabilities = detectIndexCapabilities(mapping);

            logger.info(
              `IndicesAPI: Index ${indexName} - Capabilities: ${capabilities.join(', ')}${
                connectorInfo ? ' (Has Connector)' : ''
              }`
            );

            return {
              name: indexName,
              docCount: parseInt(index['docs.count'] || '0'),
              storeSize: index['store.size'] || '0b',
              health: index.health || 'unknown',
              status: index.status || 'unknown',
              capabilities,
              connector: connectorInfo || null,
            };
          });

        logger.info(`IndicesAPI: Returning ${processedIndices.length} processed indices`);

        return response.ok({
          body: {
            indices: processedIndices,
          },
        });
      } catch (error) {
        logger.error('IndicesAPI: Error occurred:', error);
        return response.badRequest({
          body: {
            message: error instanceof Error ? error.message : 'Unknown error occurred',
          },
        });
      }
    }
  );
};

function detectIndexCapabilities(mapping: any): string[] {
  const capabilities: string[] = [];

  // Check for semantic text fields (Semantic search)
  const hasSemanticText = findFieldsWithType(mapping, 'semantic_text');
  if (hasSemanticText.length > 0) {
    capabilities.push('semantic_search');
  }

  // Check for text fields (Text search)
  const hasTextFields = findFieldsWithType(mapping, 'text');
  if (hasTextFields.length > 0) {
    capabilities.push('text_search');
  }

  // Note: Federate capability will be added later when needed
  // For now, we only detect text_search and semantic_search

  return capabilities;
}

function findFieldsWithType(mapping: any, fieldType: string): string[] {
  const fields: string[] = [];

  function traverse(obj: any, path: string = '') {
    for (const [key, value] of Object.entries(obj)) {
      const currentPath = path ? `${path}.${key}` : key;

      if (value && typeof value === 'object') {
        const fieldDef = value as any;
        if (fieldDef.type === fieldType) {
          fields.push(currentPath);
        }

        // Recursively check nested objects and properties
        if (fieldDef.properties) {
          traverse(fieldDef.properties, currentPath);
        }
      }
    }
  }

  traverse(mapping);
  return fields;
}
