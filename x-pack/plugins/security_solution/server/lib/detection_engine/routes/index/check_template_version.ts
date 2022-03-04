/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { get } from 'lodash';
import { ElasticsearchClient } from 'src/core/server';
import { isOutdated } from '../../migrations/helpers';
import {
  ALIAS_VERSION_FIELD,
  SIGNALS_FIELD_ALIASES_VERSION,
  SIGNALS_TEMPLATE_VERSION,
} from './get_signals_template';

export const getTemplateVersion = async ({
  alias,
  esClient,
}: {
  esClient: ElasticsearchClient;
  alias: string;
}): Promise<number> => {
  try {
    const response = await esClient.indices.getIndexTemplate({ name: alias });
    return response.index_templates[0].index_template.version ?? 0;
  } catch (e) {
    return 0;
  }
};

export const templateNeedsUpdate = async ({
  alias,
  esClient,
}: {
  alias: string;
  esClient: ElasticsearchClient;
}): Promise<boolean> => {
  const templateVersion = await getTemplateVersion({ alias, esClient });

  return isOutdated({ current: templateVersion, target: SIGNALS_TEMPLATE_VERSION });
};

export const fieldAliasesOutdated = async (esClient: ElasticsearchClient, index: string) => {
  const indexMappings = await esClient.indices.get({ index });
  for (const [indexName, mapping] of Object.entries(indexMappings)) {
    if (indexName.startsWith(`${index}-`)) {
      const aliasesVersion = get(mapping.mappings?._meta, ALIAS_VERSION_FIELD) ?? 0;
      if (aliasesVersion < SIGNALS_FIELD_ALIASES_VERSION) {
        return true;
      }
    }
  }
  return false;
};
