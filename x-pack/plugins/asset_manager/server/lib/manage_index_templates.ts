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
import { ElasticsearchClient, Logger } from '@kbn/core/server';
import { ASSETS_INDEX_PREFIX } from '../constants';

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
      return true;
    }

    return false;
  });
}

// interface IndexPatternJson {
//   index_patterns: string[];
//   name: string;
//   template: {
//     mappings: Record<string, any>;
//     settings: Record<string, any>;
//   };
// }

interface TemplateManagementOptions {
  esClient: ElasticsearchClient;
  template: IndicesPutIndexTemplateRequest;
  logger: Logger;
}

export async function maybeCreateTemplate({
  esClient,
  template,
  logger,
}: TemplateManagementOptions) {
  const pattern = ASSETS_INDEX_PREFIX + '*';
  template.index_patterns = [pattern];
  let existing: IndicesGetIndexTemplateResponse | null = null;
  try {
    existing = await esClient.indices.getIndexTemplate({ name: template.name });
  } catch (error: any) {
    if (error?.name !== 'ResponseError' || error?.statusCode !== 404) {
      logger.warn(`Asset manager index template lookup failed: ${error.message}`);
    }
  }
  try {
    if (!templateExists(template, existing)) {
      await esClient.indices.putIndexTemplate(template);
    }
  } catch (error: any) {
    logger.error(`Asset manager index template creation failed: ${error.message}`);
    return;
  }

  logger.info(
    `Asset manager index template is up to date (use debug logging to see what was installed)`
  );
  logger.debug(`Asset manager index template: ${JSON.stringify(template)}`);
}

export async function upsertTemplate({ esClient, template, logger }: TemplateManagementOptions) {
  const pattern = ASSETS_INDEX_PREFIX + '*';
  template.index_patterns = [pattern];

  try {
    await esClient.indices.putIndexTemplate(template);
  } catch (error: any) {
    logger.error(`Error updating asset manager index template: ${error.message}`);
    return;
  }

  logger.info(
    `Asset manager index template is up to date (use debug logging to see what was installed)`
  );
  logger.debug(`Asset manager index template: ${JSON.stringify(template)}`);
}
