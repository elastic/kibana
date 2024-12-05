/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';

import type { MappingProperty } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';

import { AGENTS_INDEX } from '../../../common';

export interface AgentMapping {
  field: string;
}

export async function getAgentFields(esClient: ElasticsearchClient): Promise<AgentMapping[]> {
  const mappinResponse = await esClient.indices.getMapping({
    index: AGENTS_INDEX,
    ignore_unavailable: true,
    allow_no_indices: true,
  });
  const fields: AgentMapping[] = [];
  const mappings = Object.entries(mappinResponse)[0]?.[1].mappings?.properties;
  if (!mappings) {
    return fields;
  }
  const flatFields = flattenFields(mappings);
  return flatFields.map((field) => ({ field }));
}

function flattenFields(mappings: Record<string, MappingProperty>) {
  const fields: string[] = [];
  for (const [key, prop] of Object.entries(mappings)) {
    if ('properties' in prop) {
      const flattenedFields = flattenFields(prop.properties!);
      fields.push(...flattenedFields.map((f) => `${key}.${f}`));
    } else {
      fields.push(key);
    }
  }
  return fields;
}
