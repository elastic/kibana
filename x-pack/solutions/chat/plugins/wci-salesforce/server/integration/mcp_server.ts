/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from '@kbn/zod';
import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import { createMcpServer as createServer, McpServerTool, toolResultFactory } from '@kbn/wci-server';
import { getCases, getAccounts, searchDocs, getById } from './tools';

// Define enum field structure upfront
interface Field {
  field: string;
  description: string;
  path?: string; // Optional path for nested fields
}

// Define enum value structure
interface FieldWithValues extends Field {
  values: string[];
}

export async function createMcpServer({
  integrationId,
  configuration,
  elasticsearchClient,
  logger,
}: {
  integrationId: string;
  configuration: Record<string, any>;
  elasticsearchClient: ElasticsearchClient;
  logger: Logger;
}): Promise<McpServer> {
  const { index } = configuration;

  const enumFields: Field[] = [
    { field: 'priority', description: 'Case priority level', path: 'metadata.priority' },
    {
      field: 'status',
      description: 'Current status of the case',
      path: 'metadata.status',
    },
  ];

  // Extract field mappings for sorting parameters
  const sortableFields = await getSortableFields(elasticsearchClient, logger, index);
  logger.debug('Salesforce Integration Sortable Fields ' + JSON.stringify(sortableFields));

  const enumFieldValues = await getFieldValues(elasticsearchClient, logger, index, enumFields);
  // Extract specific values for tool parameters
  const priorityValues = enumFieldValues.find((f) => f.field === 'priority')?.values || [];
  const statusValues = enumFieldValues.find((f) => f.field === 'status')?.values || [];

  // Create enum types for validation
  const priorityEnum = z.enum(
    priorityValues.length ? (priorityValues as [string, ...string[]]) : ['']
  );
  const statusEnum = z.enum(statusValues.length ? (statusValues as [string, ...string[]]) : ['']);
  const dataSources = ['support_case', 'account'];

  const searchTool: McpServerTool = {
    name: 'search',
    description: 'Use to search through Salesforce data (like Cases)',
    schema: {
      objects: z
        .array(z.string())
        .optional()
        .describe(
          `If provided, will limit the types of Salesforce documents to return. Can only be a out of these ${dataSources}.`
        ),
      query: z
        .string()
        .describe(
          'Only Salesforce documents that relate to this query string will be returned. For example, a query of "memory error" may return Case records where the issue was related to running out of RAM.'
        ),
      createdAfter: z
        .string()
        .optional()
        .describe(
          'If provided, will limit results to only include documents created after this date (format: YYYY-MM-DD).'
        ),
      createdBefore: z
        .string()
        .optional()
        .describe(
          'If provided, will limit results to only include documents created before this date (format: YYYY-MM-DD).'
        ),
      updatedAfter: z
        .string()
        .optional()
        .describe(
          'If provided, will limit results to only include documents updated after this date (format: YYYY-MM-DD).'
        ),
      updatedBefore: z
        .string()
        .optional()
        .describe(
          'If provided, will limit results to only include documents updated before this date (format: YYYY-MM-DD).'
        ),
    },
    execute: async ({
      objects,
      query,
      createdAfter,
      createdBefore,
      updatedAfter,
      updatedBefore,
    }) => {
      try {
        const content = await searchDocs({
          esClient: elasticsearchClient,
          logger,
          integrationId,
          indexName: index,
          filters: {
            query,
            objects,
            createdAfter,
            createdBefore,
            updatedAfter,
            updatedBefore,
          },
        });

        return toolResultFactory.contentList(content);
      } catch (e) {
        return toolResultFactory.error(`Error fetching cases: ${e.message}`);
      }
    },
  };

  const getTool: McpServerTool = {
    name: 'get',
    description:
      'Retrieves a single Salesforce document by its ID. If there is no ID, use another tool (like "search").',
    schema: {
      id: z.string().describe('ID of the Salesforce document').min(1, 'ID cannot be empty'),
      dataSource: z
        .string()
        .describe(
          `which Salesforce object type to search through. Supported object types ${dataSources}`
        ),
    },
    execute: async ({ id, dataSource }) => {
      try {
        if (!id) {
          logger.warn('Salesforce `get` tool called without an ID.');
          throw new Error(
            "ID must have a non-empty value. If no ID is present, use another tool, like 'search'."
          );
        }
        const content = await getById({
          esClient: elasticsearchClient,
          logger,
          integrationId,
          indexName: index,
          dataSource,
          id,
        });

        return toolResultFactory.contentList(content);
      } catch (e) {
        return toolResultFactory.error(`Error fetching cases: ${e.message}`);
      }
    },
  };

  const getCasesTool: McpServerTool = {
    name: 'get_cases',
    description: 'Retrieves Salesforce support cases with flexible filtering options',
    schema: {
      caseNumber: z.array(z.string()).optional().describe('Salesforce case number identifiers'),
      id: z.array(z.string()).optional().describe('Salesforce internal IDs of the support cases'),
      size: z.number().int().positive().default(10).describe('Maximum number of cases to return'),
      sortField: z
        .string()
        .optional()
        .describe(`Field to sort results by. Can only be one of these ${sortableFields}`),
      sortOrder: z
        .string()
        .optional()
        .describe(
          `Sorting order. Can only be 'desc' meaning sort in descending order or 'asc' meaning sort in ascending order`
        ),
      ownerEmail: z
        .array(z.string())
        .optional()
        .describe('Emails of case owners/assignees to filter results'),
      priority: z
        .array(priorityEnum)
        .optional()
        .describe(
          `Case priority levels${
            priorityValues.length ? ` (values from: ${priorityValues.join(', ')})` : ''
          }`
        ),
      status: z
        .array(statusEnum)
        .optional()
        .describe(
          `Current statuses of the cases${
            statusValues.length ? ` (values from: ${statusValues.join(', ')})` : ''
          }`
        ),
      closed: z.boolean().optional().describe('Filter by case closure status (true/false)'),
      createdAfter: z
        .string()
        .optional()
        .describe('Return cases created after this date (format: YYYY-MM-DD)'),
      createdBefore: z
        .string()
        .optional()
        .describe('Return cases created before this date (format: YYYY-MM-DD)'),
      updatedAfter: z
        .string()
        .optional()
        .describe('Return cases updated after this date (format: YYYY-MM-DD)'),
      updatedBefore: z
        .string()
        .optional()
        .describe('Return cases updated before this date (format: YYYY-MM-DD)'),
      commentAuthorEmail: z
        .array(z.string())
        .optional()
        .describe('Filter cases by the email of the comment author'),
      commentCreatedAfter: z
        .string()
        .optional()
        .describe('Filter cases with comments created after this date (format: YYYY-MM-DD)'),
      commentCreatedBefore: z
        .string()
        .optional()
        .describe('Filter cases with comments created before this date (format: YYYY-MM-DD)'),
    },
    execute: async ({
      id,
      size = 10,
      sortField,
      sortOrder,
      priority,
      closed,
      caseNumber,
      createdAfter,
      createdBefore,
      status,
      updatedAfter,
      updatedBefore,
      commentAuthorEmail,
      commentCreatedAfter,
      commentCreatedBefore,
      ownerEmail,
    }) => {
      try {
        const caseContent = await getCases({
          esClient: elasticsearchClient,
          logger,
          integrationId,
          indexName: index,
          params: {
            id,
            size,
            sortField,
            sortOrder,
            priority,
            closed,
            caseNumber,
            createdAfter,
            createdBefore,
            status,
            updatedAfter,
            updatedBefore,
            commentAuthorEmail,
            commentCreatedAfter,
            commentCreatedBefore,
            ownerEmail,
          },
        });

        logger.debug(`Retrieved ${caseContent.length} support cases`);

        return toolResultFactory.contentList(caseContent);
      } catch (e) {
        return toolResultFactory.error(`Error fetching cases: ${e.message}`);
      }
    },
  };

  const getAccountsTool: McpServerTool = {
    name: 'get_accounts',
    description: 'Retrieves Salesforce accounts with flexible filtering options',
    schema: {
      id: z.array(z.string()).optional().describe('Salesforce internal IDs of the accounts'),
      size: z
        .number()
        .int()
        .positive()
        .default(10)
        .describe('Maximum number of accounts to return'),
      sortField: z
        .string()
        .optional()
        .describe(`Field to sort results by. Can only be one of these ${sortableFields}`),
      sortOrder: z
        .string()
        .optional()
        .describe(
          `Sorting order. Can only be 'desc' meaning sort in descending order or 'asc' meaning sort in ascending order`
        ),
      ownerEmail: z
        .array(z.string())
        .optional()
        .describe('Emails of account owners/assignees to filter results'),
      isPartner: z.boolean().optional().describe('Filter accounts by partner status (true/false)'),
      createdAfter: z
        .string()
        .optional()
        .describe('Return accounts created after this date (format: YYYY-MM-DD)'),
      createdBefore: z
        .string()
        .optional()
        .describe('Return accounts created before this date (format: YYYY-MM-DD)'),
    },
    execute: async ({
      id,
      size = 10,
      sortField,
      sortOrder,
      isPartner,
      createdAfter,
      createdBefore,
      ownerEmail,
    }) => {
      const accountContent = await getAccounts({
        esClient: elasticsearchClient,
        logger,
        integrationId,
        indexName: index,
        params: {
          id,
          size,
          sortField,
          sortOrder,
          isPartner,
          createdAfter,
          createdBefore,
          ownerEmail,
        },
      });

      logger.debug(`Retrieved ${accountContent.length} accounts`);

      return toolResultFactory.contentList(accountContent);
    },
  };

  return createServer({
    name: 'wci-salesforce',
    version: '1.0.0',
    tools: [searchTool, getTool, getCasesTool, getAccountsTool],
  });
}

/**
 * Retrieves possible values for enum fields from Elasticsearch using _terms_enum API
 */
async function getFieldValues(
  elasticsearchClient: ElasticsearchClient,
  logger: Logger,
  index: string,
  enumFields: Field[]
): Promise<FieldWithValues[]> {
  const fieldValues: FieldWithValues[] = enumFields.map((field) => ({
    ...field,
    values: [],
  }));

  try {
    for (let i = 0; i < enumFields.length; i++) {
      const field = enumFields[i];
      const fieldPath = field.path || field.field;

      const response = await elasticsearchClient.termsEnum({
        index,
        field: fieldPath,
      });

      if (response.terms && response.terms.length) {
        fieldValues[i] = {
          ...fieldValues[i],
          values: response.terms,
        };
      }
    }
  } catch (error) {
    logger.error(`Failed to get terms enum for fields: ${error}`);
  }

  return fieldValues;
}
/**
 * Retrieves index field properties for sorting
 */
async function getSortableFields(
  client: ElasticsearchClient,
  logger: Logger,
  indexName: string
): Promise<Record<string, any>> {
  const sortableFieldTypes = ['keyword', 'date', 'boolean', 'integer', 'long', 'double', 'float'];
  const sortableFields = [];
  try {
    const response = await client.indices.getMapping({
      index: indexName,
    });

    if (response) {
      const properties = response[indexName].mappings.properties as Record<string, any>;

      for (const [fieldName, fieldConfig] of Object.entries(properties)) {
        if (sortableFieldTypes.includes(fieldConfig.type)) {
          const sortableField = { field: fieldName, type: fieldConfig.type };
          sortableFields.push(sortableField.field);
        }
      }
      return sortableFields;
    } else {
      throw new Error('Could not find mappings in response');
    }
  } catch (error) {
    logger.error(`Error getting field mappings for index ${indexName}:`, error);
    throw error;
  }
}
