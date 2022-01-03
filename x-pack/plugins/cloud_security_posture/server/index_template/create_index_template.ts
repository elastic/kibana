/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { MappingProperty } from '@elastic/elasticsearch/lib/api/types';
import type { ElasticsearchClient } from 'src/core/server';
import { CSP_KUBEBEAT_INDEX_NAME, CSP_FINDINGS_INDEX_NAME } from '../..//common/constants';
import findingsIndexMapping from './findings_mapping.json';

export type Status = boolean;

const doesIndexTemplateExist = async (esClient: ElasticsearchClient, templateName: string) => {
  try {
    const isExisting = await esClient.indices.existsIndexTemplate({ name: templateName });
    return isExisting.body;
  } catch (err) {
    return false;
  }
};

export const createIndexTemplate = async (
  esClient: ElasticsearchClient,
  indexName: string,
  indexPattern: string,
  properties: Record<string, MappingProperty>
): Promise<Status> => {
  try {
    const response = await esClient.indices.putIndexTemplate({
      name: indexName,
      index_patterns: indexPattern,
      _meta: {
        managed: true,
      },
      priority: 500,
      // TODO: fix types
      // @ts-ignore
      create: true,
      template: {
        mappings: properties,
      },
    });
    return response.body.acknowledged;
  } catch (err) {
    return false;
  }
};

export const createFindingsIndexTemplate = async (
  esClient: ElasticsearchClient
): Promise<Status> => {
  try {
    const isExisting = await doesIndexTemplateExist(esClient, CSP_FINDINGS_INDEX_NAME);
    if (isExisting) return true;
    return await createIndexTemplate(
      esClient,
      CSP_FINDINGS_INDEX_NAME,
      CSP_KUBEBEAT_INDEX_NAME,
      // TODO: check why this cast is required
      findingsIndexMapping as Record<string, MappingProperty>
    );
  } catch (err) {
    // TODO: add logger
    return false;
  }
};
