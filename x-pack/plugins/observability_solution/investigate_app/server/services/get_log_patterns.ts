/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { flatten } from 'lodash';
import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import type { LogPatternSource } from '@kbn/investigation-shared';
import {
  type LogCategory,
  categorizeDocuments,
  excludeNonImpactingCategories,
  sortByPValue,
} from '../lib/get_document_categories';
export async function getLogPatterns({
  sources,
  start,
  end,
  esClient,
  apmIndices,
}: {
  sources: LogPatternSource[];
  start: string;
  end: string;
  esClient: ElasticsearchClient;
  apmIndices?: string;
}): Promise<
  Array<{
    index: string;
    impactingPatterns: LogCategory[];
  }>
> {
  const allImpactingPatterns = await Promise.all(
    sources.map(async (source) => {
      const [patterns, dependencyPatterns] = await Promise.all([
        getPrimaryAndSecondaryCategories({
          index: source.index,
          esClient,
          documentFilters: getQueryFilters({
            'service.name': source.serviceName || '',
            'service.environment': source.serviceEnvironment || '',
            'host.hostname': source.hostName || '',
            'container.id': source.containerId || '',
          }),
          start,
          end,
        }),
        getDependencyPatterns({
          index: apmIndices || '',
          dependencies: source.dependencies || [],
          start,
          end,
          esClient,
        }),
      ]);
      const entityPatterns = patterns.impactingPatterns.map((pattern) => ({
        ...pattern,
        source: source.entity,
      }));
      const flattenedDependencyPatterns = dependencyPatterns.flatMap(
        (dependencyPattern) => dependencyPattern.impactingPatterns
      );
      const impactingPatterns = sortByPValue([...entityPatterns, ...flattenedDependencyPatterns]);
      return {
        index: source.index,
        impactingPatterns,
      };
    })
  );
  const flattenedPatterns = flatten(allImpactingPatterns);
  return flattenedPatterns;
}

async function getDependencyPatterns({
  index,
  dependencies,
  start,
  end,
  esClient,
}: {
  index: string;
  dependencies: string[];
  start: string;
  end: string;
  esClient: ElasticsearchClient;
}): Promise<Array<{ impactingPatterns: LogCategory[] }>> {
  const allImpactingPatterns = await Promise.all(
    dependencies.map(async (dependency) => {
      const { impactingPatterns } = await getPrimaryAndSecondaryCategories({
        index,
        esClient,
        documentFilters: getDependencyFilters([dependency]),
        start,
        end,
      });
      return {
        impactingPatterns: impactingPatterns.map((pattern) => ({ ...pattern, source: dependency })),
      };
    })
  );

  return allImpactingPatterns;
}

async function getPrimaryAndSecondaryCategories({
  index,
  esClient,
  documentFilters,
  start,
  end,
}: {
  index: string;
  esClient: ElasticsearchClient;
  documentFilters: QueryDslQueryContainer[];
  start: string;
  end: string;
}): Promise<{ impactingPatterns: LogCategory[] }> {
  const primaryCategories = await categorizeDocuments({
    index,
    esClient,
    endTimestamp: end,
    startTimestamp: start,
    timeField: '@timestamp',
    messageField: 'message',
    ignoredCategoryTerms: [],
    samplingProbability: 0.1,
    documentFilters,
  });
  // Get secondary categories
  const secondaryCategories = await categorizeDocuments({
    index,
    esClient,
    endTimestamp: end,
    startTimestamp: start,
    timeField: '@timestamp',
    messageField: 'message',
    ignoredCategoryTerms: primaryCategories.categories.map((category) => category.terms),
    samplingProbability: 1,
    documentFilters,
  });

  const allPatterns = [...primaryCategories.categories, ...secondaryCategories.categories];
  const impactingPatterns = sortByPValue(excludeNonImpactingCategories(allPatterns));
  return {
    impactingPatterns,
  };
}

const getQueryFilters = (filters: Record<string, string>): QueryDslQueryContainer[] => {
  const definedFilters = Object.fromEntries(Object.entries(filters).filter(([, value]) => !!value));
  return [
    {
      bool: {
        should: Object.entries(definedFilters).map(([key, value]) => ({
          match: {
            [key]: value,
          },
        })),
        minimum_should_match: 1,
      },
    },
  ];
};

const getDependencyFilters = (dependencies: string[]): QueryDslQueryContainer[] => {
  return [
    {
      bool: {
        should: dependencies.map((dependency) => ({
          match: {
            'service.name': dependency,
          },
        })),
        minimum_should_match: 1,
      },
    },
  ];
};
