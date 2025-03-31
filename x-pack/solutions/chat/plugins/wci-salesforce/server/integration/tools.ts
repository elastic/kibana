/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SearchRequest, SearchResponse, SortOrder } from '@elastic/elasticsearch/lib/api/types';
import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { SupportCase } from './types';

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
}

/**
 * Retrieves Salesforce cases
 *
 * @param esClient - Elasticsearch client
 * @param logger - Logger instance
 * @param indexName - Index name to query
 * @param params - Search parameters including optional sorting configuration
 */
export async function retrieveCases(
  esClient: ElasticsearchClient,
  logger: Logger,
  indexName: string,
  params: CaseRetrievalParams = {}
): Promise<Array<{ type: 'text'; text: string }>> {
  const size = params.size || 10;
  const sort = params.sortField ? [{ [params.sortField as string]: { order: params.sortOrder as SortOrder } }] : [];

  try {
    const query = buildQuery(params);

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
      { field: 'content', type: 'text' },
      { field: 'metadata.case_number', type: 'keyword' },
      { field: 'metadata.priority', type: 'keyword' },
      { field: 'metadata.status', type: 'keyword' },
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

      return {
        type: 'text' as const,
        text: contextFields
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
          .join('\n'),
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

function buildQuery(params: CaseRetrievalParams): any {
  const mustClauses: any[] = [{ term: { object_type: 'support_case' } }];

  if (params.id && params.id.length > 0) mustClauses.push({ terms: { id: params.id } });
  if (params.caseNumber && params.caseNumber.length > 0)
    mustClauses.push({ terms: { 'metadata.case_number': params.caseNumber } });
  if (params.ownerEmail && params.ownerEmail.length > 0)
    mustClauses.push({ terms: { 'owner.emailaddress': params.ownerEmail } });
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

  if (params.semanticQuery) {
    mustClauses.push({
      semantic: { field: 'content_semantic', query: params.semanticQuery, boost: 2.0 },
    });
  }

  return { bool: { must: mustClauses } };
}
