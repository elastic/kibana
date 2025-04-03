/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  SearchRequest,
  SearchResponse,
  SortOrder,
} from '@elastic/elasticsearch/lib/api/types';
import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { SupportCase, Account } from './types';

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
  semanticQuery?: string;
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

/**
 * Retrieves Salesforce cases
 *
 * @param esClient - Elasticsearch client
 * @param logger - Logger instance
 * @param indexName - Index name to query
 * @param params - Search parameters including optional sorting configuration
 */
export async function getCases(
  esClient: ElasticsearchClient,
  logger: Logger,
  indexName: string,
  params: CaseRetrievalParams = {}
): Promise<Array<{ type: 'text'; text: string }>> {
  const size = params.size || 10;
  const sort = params.sortField
    ? [{ [params.sortField as string]: { order: params.sortOrder as SortOrder } }]
    : [];

  try {
    const query = buildCaseQuery(params);

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
        type: 'text' as const,
        text:
          contextFields
            .map(({ field }) => {
              const fieldPath = field.split('.');
              let value = '';

              // Use the helper function for both nested and non-nested fields
              value =
                fieldPath.length > 1
                  ? getNestedValue(source, fieldPath)
                  : (source[field as keyof SupportCase] || '').toString();

              return `${field}: ${value}`;
            })
            .join('\n') + commentsText,
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
export async function getAccounts(
  esClient: ElasticsearchClient,
  logger: Logger,
  indexName: string,
  params: AccountRetrievalParams = {}
): Promise<Array<{ type: 'text'; text: string }>> {
  const size = params.size || 10;
  const sort = params.sortField
    ? [{ [params.sortField as string]: { order: params.sortOrder as SortOrder } }]
    : [];

  try {
    const query = buildAccountQuery(params);

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

    const contentFragments = response.hits.hits.map((hit) => {
      const source = hit._source as Account;

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
        type: 'text' as const,
        text:
          contextFields
            .map(({ field }) => {
              const fieldPath = field.split('.');
              let value = '';

              // Use the helper function for both nested and non-nested fields
              value =
                fieldPath.length > 1
                  ? getNestedValue(source, fieldPath)
                  : (source[field as keyof Account] || '').toString();

              return `${field}: ${value}`;
            })
            .join('\n') + contactsText,
      };
    });

    return contentFragments;
  } catch (error) {
    logger.error(`Account search failed: ${error}`);

    return [
      {
        type: 'text' as const,
        text: `Error: Account search failed: ${error}`,
      },
    ];
  }
}

function buildCaseQuery(params: CaseRetrievalParams): any {
  const mustClauses: any[] = [{ term: { object_type: 'support_case' } }];

  if (params.id && params.id.length > 0) mustClauses.push({ terms: { id: params.id } });
  if (params.caseNumber && params.caseNumber.length > 0)
    mustClauses.push({ terms: { 'metadata.case_number': params.caseNumber } });
  if (params.ownerEmail && params.ownerEmail.length > 0)
    mustClauses.push({ terms: { 'owner.email': params.ownerEmail } });
  if (params.priority && params.priority.length > 0)
    mustClauses.push({ terms: { 'metadata.priority': params.priority } });
  if (params.status && params.status.length > 0)
    mustClauses.push({ terms: { 'metadata.status': params.status } });
  if (params.closed !== undefined) mustClauses.push({ term: { 'metadata.closed': params.closed } });

  if (params.createdAfter || params.createdBefore) {
    const range: any = { range: { created_at: {} } };
    if (params.createdAfter) range.range.created_at.gte = params.createdAfter;
    if (params.createdBefore) range.range.created_at.lte = params.createdBefore;
    mustClauses.push(range);
  }

  if (params.updatedAfter || params.updatedBefore) {
    const range: any = { range: { updated_at: {} } };
    if (params.updatedAfter) range.range.updated_at.gte = params.updatedAfter;
    if (params.updatedBefore) range.range.updated_at.lte = params.updatedBefore;
    mustClauses.push(range);
  }

  // Add comment-related queries
  if (params.commentAuthorEmail || params.commentCreatedAfter || params.commentCreatedBefore) {
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
    if (params.commentAuthorEmail && params.commentAuthorEmail.length > 0) {
      nestedQuery.nested.query.bool.must.push({
        terms: { 'comments.author.email': params.commentAuthorEmail },
      });
    }

    // Add comment date range filters
    if (params.commentCreatedAfter || params.commentCreatedBefore) {
      const commentDateRange: any = { range: { 'comments.created_at': {} } };
      if (params.commentCreatedAfter)
        commentDateRange.range['comments.created_at'].gte = params.commentCreatedAfter;
      if (params.commentCreatedBefore)
        commentDateRange.range['comments.created_at'].lte = params.commentCreatedBefore;
      nestedQuery.nested.query.bool.must.push(commentDateRange);
    }

    mustClauses.push(nestedQuery);
  }

  if (params.semanticQuery) {
    mustClauses.push({
      semantic: { field: 'content_semantic', query: params.semanticQuery, boost: 2.0 },
    });
  }

  return { bool: { must: mustClauses } };
}

function buildAccountQuery(params: AccountRetrievalParams): any {
  const mustClauses: any[] = [{ term: { object_type: 'account' } }];

  if (params.id && params.id.length > 0) mustClauses.push({ terms: { id: params.id } });
  if (params.ownerEmail && params.ownerEmail.length > 0)
    mustClauses.push({ terms: { 'owner.email': params.ownerEmail } });
  if (params.isPartner !== undefined)
    mustClauses.push({ term: { 'metadata.is_partner': params.isPartner } });

  if (params.createdAfter || params.createdBefore) {
    const range: any = { range: { created_at: {} } };
    if (params.createdAfter) range.range.created_at.gte = params.createdAfter;
    if (params.createdBefore) range.range.created_at.lte = params.createdBefore;
    mustClauses.push(range);
  }

  return { bool: { must: mustClauses } };
}
