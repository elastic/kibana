/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient } from 'kibana/server';

/**
 * @deprecated Use the one from kbn-securitysolution-es-utils
 */
export const setTemplate = async (
  esClient: ElasticsearchClient,
  name: string,
  body: Record<string, unknown>
): Promise<unknown> => {
  return (
    await esClient.indices.putTemplate({
      name,
      body,
    })
  ).body;
};
