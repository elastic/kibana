/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { MappingTypeMapping } from '@elastic/elasticsearch/lib/api/types';
import type { ElasticsearchClient } from 'src/core/server';
import { CSP_KUBEBEAT_INDEX_NAME, CSP_FINDINGS_INDEX_NAME } from '../../common/constants';
import { mapping as findingsIndexMapping } from './findings_mapping';

export type Status = boolean;

const doesIndexTemplateExist = async (esClient: ElasticsearchClient, templateName: string) => {
  try {
    const response = await esClient.indices.existsIndexTemplate({ name: templateName });
    return response.body;
  } catch (err) {
    return false;
  }
};

const createIndexTemplate = async (
  esClient: ElasticsearchClient,
  indexName: string,
  indexPattern: string,
  properties: MappingTypeMapping
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
    const indexTemplateExists = await doesIndexTemplateExist(esClient, CSP_FINDINGS_INDEX_NAME);
    if (indexTemplateExists) return true;
    return await createIndexTemplate(
      esClient,
      CSP_FINDINGS_INDEX_NAME,
      CSP_KUBEBEAT_INDEX_NAME,
      // TODO: check why this cast is required
      findingsIndexMapping
    );
  } catch (err) {
    // TODO: add logger
    return false;
  }
};
