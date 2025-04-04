/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  QueryDslQueryContainer,
  SearchRequest,
  SearchResponse,
  SortOrder,
} from '@elastic/elasticsearch/lib/api/types';
import { contentRefBuilder, ContentRefSourceType } from '@kbn/wci-common';
import { ToolContentResult } from '@kbn/wci-server';
import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { SupportCase, Account } from './types';

interface SearchParams {
  size?: number;
  createdAfter?: string;
  createdBefore?: string;
  semanticQuery?: string;
  updatedAfter?: string;
  updatedBefore?: string;
}

interface CaseRetrievalParams {
  id?: string[];
  size?: number;
  sortField?: string;
  sortOrder?: string;
  ownerEmail?: string[];
  priority?: string[];
  closed?: boolean;
  caseNumber?: string[];
  createdAfter?: string;
  createdBefore?: string;
  status?: string[];
  updatedAfter?: string;
  updatedBefore?: string;
  commentAuthorEmail?: string[];
  commentCreatedAfter?: string;
  commentCreatedBefore?: string;
}

interface AccountRetrievalParams {
  id?: string[];
  size?: number;
  sortField?: string;
  sortOrder?: string;
  ownerEmail?: string[];
  isPartner?: boolean;
  createdAfter?: string;
  createdBefore?: string;
}

// Shared base mappings
const baseObjectMappings: Record<string, string> = {
  'id': 'id',
  'title': 'title',
  'url': 'url',
  'ownerEmail': 'owner.email',
  'ownerName': 'owner.name',
  'createdAt': 'created_at',
  'updatedAt': 'updated_at',
};

/**
 * Search through Salesforce
 *
 * @param esClient - Elasticsearch client
 * @param logger - Logger instance
 * @param indexName - Index name to query
 * @param dataSource - data source to search through
 * @param params - parameters to filter results by
 */
export async function search(
  esClient: ElasticsearchClient,
  logger: Logger,
  indexName: string,
  dataSource: string,
  params: SearchParams
){
  const size = params.size || 10;

  let query: QueryDslQueryContainer = {}
  if (dataSource == 'support_case'){
    query = buildQuery(params, 'support_case', baseObjectMappings)
  } else if (dataSource == 'account') {
    query = buildQuery(params, 'account', baseObjectMappings)
  } else if (dataSource == 'all') {
    query = buildQuery(params, 'all', baseObjectMappings)
  }
  
  try {
    const searchRequest: SearchRequest = {
      index: indexName,
      query: query,
      size: size
    };
    const response = await esClient.search<SearchResponse<SupportCase>>(searchRequest);

    const contextFields = [
      { field: 'id', type:  'keyword'},
      { field: 'title', type:  'keyword' },
      { field: 'description', type: 'text' },
      { field: 'url', type:  'keyword' },
    ];

    const contentFragments = response.hits.hits.map((hit) => {
      const source = hit._source as SupportCase;

      return {
        type: 'text' as const,
        text:
          contextFields
            .map(({ field }) => {
            const value = (source[field as keyof SupportCase] || '').toString()
            return `$ field}: ${value}`;
            })
            .join('\n')
      };
    });

    return contentFragments;
  } catch (error) {
    logger.error(`Search failed: ${error}`);

    return [
      {
        type: 'text' as const,
        text: `Error: Search failed: ${error}`,
      },
    ];
  }
}

export async function get(
  esClient: ElasticsearchClient,
  logger: Logger,
  indexName: string,
  dataSource: string,
  params: Record<string, any>
){

  let query: QueryDslQueryContainer = {}
  if (dataSource == 'support_case'){
    query = buildQuery(params, 'support_case', baseObjectMappings)
  } else if (dataSource == 'account') {
    query = buildQuery(params, 'account', baseObjectMappings)
  } else if (dataSource == 'all') {
    query = buildQuery(params, 'all', baseObjectMappings)
  }
  
  try {
    const searchRequest: SearchRequest = {
      index: indexName,
      query: query
    };
    const response = await esClient.search<SearchResponse<SupportCase>>(searchRequest);

    const contextFields = [
      { field: 'id', type:  'keyword'},
      { field: 'title', type:  'keyword' },
      { field: 'description', type: 'text' },
      { field: 'url', type:  'keyword' },
    ];

    const contentFragments = response.hits.hits.map((hit) => {
      const source = hit._source as SupportCase;

      return {
        type: 'text' as const,
        text:
          contextFields
            .map(({ field }) => {
            const value = (source[field as keyof SupportCase] || '').toString()
            return `$ field}: ${value}`;
            })
            .join('\n')
      };
    });

    return contentFragments;
  } catch (error) {
    logger.error(`Search failed: ${error}`);

    return [
      {
        type: 'text' as const,
        text: `Error: Search failed: ${error}`,
      },
    ];
  }
}



/**
 * Retrieves Salesforce cases
 *
 * @param esClient - Elasticsearch client
 * @param logger - Logger instance
 * @param indexName - Index name to query
 * @param params - Search parameters including optional sorting configuration
 */
export async function getCases({
  esClient,
  logger,
  integrationId,
  indexName,
  params = {},
}: {
  esClient: ElasticsearchClient;
  logger: Logger;
  integrationId: string;
  indexName: string;
  params: CaseRetrievalParams;
}): Promise<ToolContentResult[]> {
  const size = params.size || 10;
  const sort = params.sortField
    ? [{ [params.sortField as string]: { order: params.sortOrder as SortOrder } }]
    : [];
  const supportCaseMappings: Record<string, string> = {
    ...baseObjectMappings,
    'caseNumber': 'metadata.case_number',
    'priority': 'metadata.priority',
    'status': 'metadata.status',
    'accountId': 'metadata.account_id',
    'accountName': 'metadata.account_name',
  };

  try {

    const query = buildQuery(params, 'support_case', supportCaseMappings);

  const searchRequest: SearchRequest = {
    index: indexName,
    query,
    sort,
    size,
  };

  logger.info(
    `Retrieving cases from ${indexName} with search request: ${JSON.stringify(searchRequest)}`
  );

  const response = await esClient.search<SearchResponse<SupportCase>>(searchRequest);

  // Let's keep this here for now
  const contextFields = [
    { field: 'title', type: 'keyword' },
    { field: 'description', type: 'text' },
    { field: 'url', type: 'keyword' },
    { field: 'metadata.case_number', type: 'keyword' },
    { field: 'metadata.priority', type: 'keyword' },
    { field: 'metadata.status', type: 'keyword' },
    { field: 'metadata.account_id', type: 'keyword' },
    { field: 'metadata.account_name', type: 'keyword' },
    { field: 'owner.email', type: 'keyword' },
    { field: 'owner.name', type: 'keyword' },
  ];

  const createRef = contentRefBuilder({
    sourceType: ContentRefSourceType.integration,
    sourceId: integrationId,
  });

  const contentFragments = response.hits.hits.map((hit) => {
    const source = hit._source as SupportCase;

    // Helper function to safely get nested values
    const getNestedValue = (obj: any, path: string[]): string => {
      return (
        path
          .reduce((prev, curr) => {
            return prev && typeof prev === 'object' && curr in prev ? prev[curr] : '';
          }, obj)
          ?.toString() || ''
      );
    };

    // Format comments if they exist
    let commentsText = '';
    if (source.comments && source.comments.length > 0) {
      const limitedComments = source.comments.slice(0, 10);

      commentsText =
        '\n\nComments:\n' +
        limitedComments
          .map((comment, index) => {
            return (
              `Comment ${index + 1}:\n` +
              `Author: ${comment.author?.name || 'Unknown'} (${
                comment.author?.email || 'No email'
              })\n` +
              `Created: ${comment.created_at || 'Unknown date'}\n` +
              `Content: ${comment.content || 'No content'}\n`
            );
          })
          .join('\n');
    }

    return {
      reference: createRef(`case:${hit._id!}`),
      content: contextFields.reduce<ToolContentResult['content']>(
        (content, { field }) => {
          const fieldPath = field.split('.');

          // Use the helper function for both nested and non-nested fields
          const value =
            fieldPath.length > 1
              ? getNestedValue(source, fieldPath)
              : (source[field as keyof SupportCase] || '').toString();

          content[field] = value;

          return content;
        },
        {
          commentsText,
        }
      ),
    };
  });

  return contentFragments;
} catch (error) {
  logger.error(`Search failed: ${error}`);

  return [
    {
      type: 'text' as const,
      text: `Error: Search failed: ${error}`,
    },
  ];
}
}

/**
 * Retrieves Salesforce accounts
 *
 * @param esClient - Elasticsearch client
 * @param logger - Logger instance
 * @param indexName - Index name to query
 * @param params - Search parameters including optional sorting configuration
 */
export async function getAccounts({
  esClient,
  logger,
  integrationId,
  indexName,
  params = {},
}: {
  esClient: ElasticsearchClient;
  logger: Logger;
  integrationId: string;
  indexName: string;
  params: AccountRetrievalParams;
}): Promise<ToolContentResult[]> {
  const size = params.size || 10;
  const sort = params.sortField
    ? [{ [params.sortField as string]: { order: params.sortOrder as SortOrder } }]
    : [];
  const accountMappings: Record<string, string> = {
    ...baseObjectMappings,
    'recordTypeId': 'metadata.record_type_id',
    'isPartner': 'metadata.is_partner',
    'isCustomerPortal': 'metadata.is_customer_portal',
  };

  try {

  const query = buildQuery(params, 'account', accountMappings);

  const searchRequest: SearchRequest = {
    index: indexName,
    query,
    sort,
    size,
  };

  logger.info(
    `Retrieving accounts from ${indexName} with search request: ${JSON.stringify(searchRequest)}`
  );

  const response = await esClient.search<SearchResponse<Account>>(searchRequest);

  // Define fields to include in the response
  const contextFields = [
    { field: 'id', type: 'keyword' },
    { field: 'title', type: 'keyword' },
    { field: 'url', type: 'keyword' },
    { field: 'owner.email', type: 'keyword' },
    { field: 'owner.name', type: 'keyword' },
    { field: 'created_at', type: 'date' },
    { field: 'updated_at', type: 'date' },
  ];

  const createRef = contentRefBuilder({
    sourceType: ContentRefSourceType.integration,
    sourceId: integrationId,
  });

  const contentFragments = response.hits.hits.map((hit) => {
    const source = hit._source as Account;

    // Format contacts if they exist
    let contactsText = '';
    if (source.contacts && source.contacts.length > 0) {
      const limitedContacts = source.contacts.slice(0, 10);
      contactsText =
        '\n\nContacts:\n' +
        limitedContacts
          .map((contact, index) => {
            return (
              `Contact ${index + 1}:\n` +
              `Name: ${contact.name || 'Unknown'}\n` +
              `Email: ${contact.email || 'No email'}\n` +
              `Phone: ${contact.phone || 'No phone'}\n` +
              `Title: ${contact.title || 'No title'}\n` +
              `Department: ${contact.department || 'No department'}\n`
            );
          })
          .join('\n');
    }

    return {
      reference: createRef(`account:${hit._id!}`),
      content: contextFields.reduce<ToolContentResult['content']>(
        (content, { field }) => {
          const fieldPath = field.split('.');
          const value =
            fieldPath.length > 1
              ? getNestedValue(source, fieldPath)
              : (source[field as keyof Account] || '').toString();

          content[field] = value;

          return content;
        },
        {
          contactsText,
        }
      ),
    };
  });

  return contentFragments;
} catch (error) {
  logger.error(`Search failed: ${error}`);

  return [
    {
      type: 'text' as const,
      text: `Error: Search failed: ${error}`,
    },
  ];
}
}

// Helper function to safely get nested values
function getNestedValue(obj: any, path: string[]) {
  return (
    path
      .reduce((prev, curr) => {
        return prev && typeof prev === 'object' && curr in prev ? prev[curr] : '';
      }, obj)
      ?.toString() || ''
  );
};

function addTermsClause(mustClauses: any[], field: string, value: any, mappings?: Record<string, string>) {

  if (mappings && mappings[field]) {
    if (Array.isArray(value)) {
      mustClauses.push({ terms: { [mappings[field]]: value } });
    } else {
      mustClauses.push({ term: { [mappings[field]]: value } });
    }
  }
}

function addDateRangeClause(mustClauses: any[], field: string, createdAfter?: string, createdBefore?: string) {
  if (createdAfter || createdBefore) {
    const range: any = { range: { [field]: {} } };
    if (createdAfter) range.range[field].gte = createdAfter;
    if (createdBefore) range.range[field].lte = createdBefore;
       mustClauses.push(range);
     }
  }

function addCommentFilters(mustClauses: any[], commentAuthorEmail: string, commentCreatedAfter: string, commentCreatedBefore: string) {
  // Add comment-related queries
  if (commentAuthorEmail || commentCreatedAfter || commentCreatedBefore) {
    const nestedQuery: any = {
      nested: {
        path: 'comments',
        query: {
          bool: {
            must: [],
          },
        },
      },
    };

    // Add comment author filter
    if (commentAuthorEmail && commentAuthorEmail.length > 0) {
      nestedQuery.nested.query.bool.must.push({
        terms: { 'comments.author.email': commentAuthorEmail },
      });
    }

    // Add comment date range filters
    if (commentCreatedAfter || commentCreatedBefore) {
      const commentDateRange: any = { range: { 'comments.created_at': {} } };
      if (commentCreatedAfter)
        commentDateRange.range['comments.created_at'].gte = commentCreatedAfter;
      if (commentCreatedBefore)
        commentDateRange.range['comments.created_at'].lte = commentCreatedBefore;
      nestedQuery.nested.query.bool.must.push(commentDateRange);
    }

    mustClauses.push(nestedQuery);
  }
}

function addSemanticQuery(mustClauses: any[], semanticQuery?: string): void {
  if (semanticQuery) {
    mustClauses.push({
      semantic: { field: 'content_semantic', query: semanticQuery, boost: 2.0 },
    });
  }
}

function buildQuery(params: Record<string,any>, objectType: string, mappings: Record<string, string>): any {
  let mustClauses: any[] = [];
  
  if (objectType == 'all') {
    mustClauses.push({ terms: { object_type: ['support_case', 'account']} });
  } else {
    mustClauses.push({ term: { object_type: objectType} });
  }

  Object.entries(params).forEach(( [field, value]) => {
    if (value) {
      if  (field === 'semanticQuery') {
        addSemanticQuery(mustClauses, value);
      } else if  (field === 'createdAfter' || field === 'createdBefore') {
        if (!mustClauses.some(clause => clause.range && clause.range.created_at !== undefined)) {
          addDateRangeClause(mustClauses, 'created_at', params.createdAfter, params.createdBefore);
        }
      } else if  (field === 'updatedAfter' || field === 'updatedBefore') {
        if (!mustClauses.some(clause => clause.range && clause.range.updated_at !== undefined)) {
          addDateRangeClause(mustClauses, 'updated_at', params.updatedAfter, params.updatedBefore);
        }
      } else if  (field === 'commentAuthorEmail' || field === 'commentCreatedAfter' || field === 'commentCreatedBefore') {
        addCommentFilters(mustClauses, params.commentAuthorEmail, params.commentCreatedAfter, params.commentCreatedBefore)
      } else {
        addTermsClause(mustClauses, field, value, mappings);
      }
    }
  });
  
  return { bool: { must: mustClauses } };
}
