/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient } from 'kibana/server';

// See the reference(s) below on explanations about why -000001 was chosen and
// why the is_write_index is true as well as the bootstrapping step which is needed.
// Ref: https://www.elastic.co/guide/en/elasticsearch/reference/current/applying-policy-to-template.html

/**
 * @deprecated Use the one from kbn-securitysolution-es-utils
 */
export const createBootstrapIndex = async (
  esClient: ElasticsearchClient,
  index: string
): Promise<unknown> => {
  return (
    await esClient.transport.request({
      path: `/${index}-000001`,
      method: 'PUT',
      body: {
        aliases: {
          [index]: {
            is_write_index: true,
          },
        },
      },
    })
  ).body;
};
