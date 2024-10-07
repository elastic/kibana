/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { flatten } from 'lodash';
import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import {
  type LogCategory,
  categorizeDocuments,
  excludeNonImpactingCategories,
} from '../lib/get_document_categories';
export async function getLogPatterns({
  sources,
  start,
  end,
  esClient,
}: {
  sources: Array<{
    index: string;
    serviceName?: string;
    serviceEnvironment?: string;
    containerId?: string;
    hostName?: string;
  }>;
  start: string;
  end: string;
  esClient: ElasticsearchClient;
}): LogCategory[] {
  const allImpactingPatterns = await Promise.all(
    sources.map(async (source) => {
      const primaryCategories = await categorizeDocuments({
        index: source.index,
        esClient,
        endTimestamp: end,
        startTimestamp: start,
        timeField: '@timestamp',
        messageField: 'message',
        ignoredCategoryTerms: [],
        samplingProbability: 0.1,
        documentFilters: getQueryFilters({
          'service.name': source.serviceName || '',
          'service.environment': source.serviceEnvironment || '',
          'host.hostname': source.hostName || '',
          'container.id': source.containerId || '',
        }),
      });
      // Get secondary categories
      const secondaryCategories = await categorizeDocuments({
        index: source.index,
        esClient,
        endTimestamp: end,
        startTimestamp: start,
        timeField: '@timestamp',
        messageField: 'message',
        ignoredCategoryTerms: primaryCategories.categories.map((category) => category.terms),
        samplingProbability: 0.1,
        documentFilters: getQueryFilters({
          'service.name': source.serviceName || '',
          'service.environment': source.serviceEnvironment || '',
          'host.hostname': source.hostName || '',
          'container.id': source.containerId || '',
        }),
      });
      const allCategories = primaryCategories.categories.concat(secondaryCategories.categories);
      const impactingPatterns = excludeNonImpactingCategories(allCategories);
      return {
        index: source.index,
        impactingPatterns,
      };
    })
  );
  return flatten(allImpactingPatterns);
}

const getQueryFilters = (filters: Record<string, string>): QueryDslQueryContainer[] => {
  const definedFilters = Object.fromEntries(Object.entries(filters).filter(([, value]) => !!value));
  return [
    {
      bool: {
        should: Object.entries(filters).map(([key, value]) => ({
          match: {
            [key]: value,
          },
        })),
        minimum_should_match: 1,
      },
    },
  ];
};
