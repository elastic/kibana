/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import {
  getFieldsTopValues,
  generateSearchSchema,
  createFilterClauses,
  hitToContent,
  type SearchFilter,
} from '@kbn/wc-integration-utils';
import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { WCIIndexSourceConfiguration } from '../../common/types';

type SearchResult = any; // TODO: fix this

export async function createMcpServer({
  configuration,
  description,
  elasticsearchClient,
  logger,
}: {
  configuration: WCIIndexSourceConfiguration;
  description: string;
  elasticsearchClient: ElasticsearchClient;
  logger: Logger;
}): Promise<McpServer> {
  const server = new McpServer({
    name: 'wci-index-source',
    version: '1.0.0',
  });

  const { index, fields } = configuration;

  const searchFilters = fields.filterFields.map<SearchFilter>((field) => ({
    field: field.field,
    description: field.description,
    values: [],
    type: field.type,
  }));

  const aggFields = fields.filterFields
    .filter((field) => field.getValues)
    .map((field) => field.field);
  if (aggFields.length > 0) {
    const topValues = await getFieldsTopValues({
      indexName: index,
      fieldNames: aggFields.map((field) => field),
      esClient: elasticsearchClient,
    });

    searchFilters.forEach((fieldValue) => {
      fieldValue.values = topValues[fieldValue.field];
    });
  }

  const toolSchema = generateSearchSchema({ filters: searchFilters });

  server.tool('search', description, toolSchema, async ({ query, ...filterValues }) => {
    logger.info(
      () =>
        `Searching for "${query}" in index "${index} with filters: ${JSON.stringify(filterValues)}"`
    );

    let result = null;

    const esFilters = createFilterClauses({ filters: searchFilters, values: filterValues });
    const contentFields = fields.contextFields.map((field) => field.field);

    try {
      const queryClause =
        query && configuration.queryTemplate
          ? JSON.parse(configuration.queryTemplate.replace('{query}', query))
          : {
              match_all: {},
            };

      result = await elasticsearchClient.search<SearchResult>({
        index,
        query: {
          bool: {
            must: [queryClause],
            ...(esFilters.length > 0 ? { filter: esFilters } : {}),
          },
        },
        _source: {
          includes: contentFields,
        },
        highlight: {
          fields: fields.contextFields.reduce((acc, field) => {
            if (field.type === 'semantic') {
              acc[field.field] = {
                type: 'semantic',
              };
            }
            return acc;
          }, {} as Record<string, any>),
        },
      });
    } catch (error) {
      logger.error(`Failed to search: ${error}`);
    }

    if (!result) {
      return {
        content: [],
      };
    }

    logger.info(`Found ${result.hits.hits.length} hits`);

    const documents = result.hits.hits.map((hit) => {
      return {
        type: 'text' as const,
        text: JSON.stringify(hitToContent({ hit, fields: contentFields })),
      };
    });

    return {
      content: documents,
    };
  });

  return server;
}
