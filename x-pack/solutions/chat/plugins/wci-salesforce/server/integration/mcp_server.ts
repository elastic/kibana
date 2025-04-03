/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import { z } from '@kbn/zod';
import { getCases, getAccounts } from './tools';

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
  configuration,
  elasticsearchClient,
  logger,
}: {
  configuration: Record<string, any>;
  elasticsearchClient: ElasticsearchClient;
  logger: Logger;
}): Promise<McpServer> {
  const server = new McpServer({
    name: 'wci-salesforce',
    version: '1.0.0',
  });

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

  server.tool(
    'get_cases',
    `Retrieves Salesforce support cases with flexible filtering options`,
    {
      caseNumber: z
        .array(z.string())
        .optional()
        .describe('Salesforce case number identifiers (preferred lookup method)'),
      id: z
        .array(z.string())
        .optional()
        .describe(
          'Salesforce internal IDs of the support cases (use only when specifically requested)'
        ),
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
      semanticQuery: z
        .string()
        .optional()
        .describe('Natural language query to search case content semantically'),
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
    async ({
      id,
      size = 10,
      sortField,
      sortOrder,
      priority,
      closed,
      caseNumber,
      createdAfter,
      createdBefore,
      semanticQuery,
      status,
      updatedAfter,
      updatedBefore,
      commentAuthorEmail,
      commentCreatedAfter,
      commentCreatedBefore,
      ownerEmail,
    }) => {
      const caseContent = await getCases(elasticsearchClient, logger, index, {
        id,
        size,
        sortField,
        sortOrder,
        priority,
        closed,
        caseNumber,
        createdAfter,
        createdBefore,
        semanticQuery,
        status,
        updatedAfter,
        updatedBefore,
        commentAuthorEmail,
        commentCreatedAfter,
        commentCreatedBefore,
        ownerEmail,
      });

      logger.info(`Retrieved ${caseContent.length} support cases`);

      logger.info(`Case content: ${JSON.stringify(caseContent)}`);

      return {
        content: caseContent,
      };
    }
  );

  server.tool(
    'get_accounts',
    `Retrieves Salesforce accounts with flexible filtering options`,
    {
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
    async ({
      id,
      size = 10,
      sortField,
      sortOrder,
      isPartner,
      createdAfter,
      createdBefore,
      ownerEmail,
    }) => {
      const accountContent = await getAccounts(elasticsearchClient, logger, index, {
        id,
        size,
        sortField,
        sortOrder,
        isPartner,
        createdAfter,
        createdBefore,
        ownerEmail,
      });

      logger.info(`Retrieved ${accountContent.length} accounts`);

      return {
        content: accountContent,
      };
    }
  );

  return server;
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
          sortableFields.push(sortableField);
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
