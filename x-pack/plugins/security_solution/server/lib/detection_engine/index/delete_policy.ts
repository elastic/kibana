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
export const deletePolicy = async (
  esClient: ElasticsearchClient,
  policy: string
): Promise<unknown> => {
  return (
    await esClient.transport.request({
      path: `/_ilm/policy/${policy}`,
      method: 'DELETE',
    })
  ).body;
};
