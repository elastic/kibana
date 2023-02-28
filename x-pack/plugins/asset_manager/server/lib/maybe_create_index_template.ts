/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  IndicesGetIndexTemplateResponse,
  IndicesPutIndexTemplateRequest,
} from '@elastic/elasticsearch/lib/api/types';
import { ElasticsearchClient } from '@kbn/core/server';
import { ASSETS_INDEX } from '../constants';

function templateExists(
  template: IndicesPutIndexTemplateRequest,
  existing: IndicesGetIndexTemplateResponse | null
) {
  if (existing === null) {
    return false;
  }

  if (existing.index_templates.length === 0) {
    return false;
  }

  const checkPatterns = Array.isArray(template.index_patterns)
    ? template.index_patterns
    : [template.index_patterns];

  return existing.index_templates.some((t) => {
    const { priority: existingPriority = 0 } = t.index_template;
    const { priority: incomingPriority = 0 } = template;
    if (existingPriority !== incomingPriority) {
      return false;
    }

    const existingPatterns = Array.isArray(t.index_template.index_patterns)
      ? t.index_template.index_patterns
      : [t.index_template.index_patterns];

    if (checkPatterns.every((p) => p && existingPatterns.includes(p))) {
      console.log(`${template.name} template already exists`);
      return true;
    }

    return false;
  });
}

interface IndexPatternJson {
  index_patterns: string[];
  name: string;
  template: {
    mappings: Record<string, any>;
    settings: Record<string, any>;
  };
}

export async function maybeCreateTemplate({
  esClient,
  template,
}: {
  esClient: ElasticsearchClient;
  template: IndexPatternJson;
}) {
  const pattern = ASSETS_INDEX;
  template.index_patterns = [pattern];
  let existing: IndicesGetIndexTemplateResponse | null = null;
  try {
    existing = await esClient.indices.getIndexTemplate({ name: template.name });
  } catch (error: any) {
    if (error?.name !== 'ResponseError' || error?.statusCode !== 404) {
      throw error;
    }
  }
  try {
    if (!templateExists(template, existing)) {
      await esClient.indices.putIndexTemplate(template);
    }
  } catch (error: any) {
    console.log('[Asset Collection: ES Setup] Error creating template');
    throw error;
  }
}
