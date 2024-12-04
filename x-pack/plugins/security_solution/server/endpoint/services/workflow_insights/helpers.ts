/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { get as _get } from 'lodash';

import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import type { ElasticsearchClient } from '@kbn/core/server';

import { DataStreamSpacesAdapter } from '@kbn/data-stream-adapter';

import type { SearchParams } from '../../../../common/endpoint/types/workflow_insights';

import {
  COMPONENT_TEMPLATE_NAME,
  DATA_STREAM_PREFIX,
  INDEX_TEMPLATE_NAME,
  INGEST_PIPELINE_NAME,
  TOTAL_FIELDS_LIMIT,
} from './constants';
import { securityWorkflowInsightsFieldMap } from './field_map_configurations';

export function createDatastream(kibanaVersion: string): DataStreamSpacesAdapter {
  const ds = new DataStreamSpacesAdapter(DATA_STREAM_PREFIX, {
    kibanaVersion,
    totalFieldsLimit: TOTAL_FIELDS_LIMIT,
  });
  ds.setComponentTemplate({
    name: COMPONENT_TEMPLATE_NAME,
    fieldMap: securityWorkflowInsightsFieldMap,
  });
  ds.setIndexTemplate({
    name: INDEX_TEMPLATE_NAME,
    componentTemplateRefs: [COMPONENT_TEMPLATE_NAME],
    template: {
      settings: {
        default_pipeline: INGEST_PIPELINE_NAME,
      },
    },
    hidden: true,
  });
  return ds;
}

export async function createPipeline(esClient: ElasticsearchClient): Promise<boolean> {
  const response = await esClient.ingest.putPipeline({
    id: INGEST_PIPELINE_NAME,
    processors: [
      // requires @elastic/elasticsearch 8.16.0
      // {
      //   fingerprint: {
      //     fields: ['type', 'category', 'value', 'target.type', 'target.id'],
      //     target_field: '_id',
      //     method: 'SHA-256',
      //     if: 'ctx._id == null',
      //   },
      // },
    ],
    _meta: {
      managed: true,
    },
  });
  return response.acknowledged;
}

const validKeys = new Set([
  'ids',
  'categories',
  'types',
  'sourceTypes',
  'sourceIds',
  'targetTypes',
  'targetIds',
  'actionTypes',
]);
const paramFieldMap = {
  ids: '_id',
  sourceTypes: 'source.type',
  sourceIds: 'source.id',
  targetTypes: 'target.type',
  targetIds: 'target.id',
  actionTypes: 'action.type',
};
export function buildEsQueryParams(searchParams: SearchParams): QueryDslQueryContainer[] {
  return Object.entries(searchParams).reduce((acc: object[], [k, v]) => {
    if (!validKeys.has(k)) {
      return acc;
    }

    const paramKey = _get(paramFieldMap, k, k);
    const next = { terms: { [paramKey]: v } };

    return [...acc, next];
  }, []);
}
