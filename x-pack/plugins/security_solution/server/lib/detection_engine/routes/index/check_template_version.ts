/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ElasticsearchClient } from 'src/core/server';
import { isOutdated } from '../../migrations/helpers';
import { SIGNALS_TEMPLATE_VERSION } from './get_signals_template';

export const getTemplateVersion = async ({
  alias,
  esClient,
}: {
  esClient: ElasticsearchClient;
  alias: string;
}): Promise<number> => {
  try {
    const response = await esClient.indices.getTemplate<{
      [templateName: string]: { version: number };
    }>({ name: alias });
    return response.body[alias].version ?? 0;
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
