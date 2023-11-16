/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EsNames } from './names';
import mappings from '../../generated/mappings.json';

// returns the body of an index template used in an ES indices.putTemplate call
export function getIndexTemplate(esNames: EsNames) {
  const indexTemplateBody = {
    _meta: {
      description: 'index template for the Kibana event log',
      managed: true,
    },
    index_patterns: [esNames.dataStream],
    data_stream: {
      hidden: true,
    },
    priority: 50,
    template: {
      settings: {
        hidden: true,
        number_of_shards: 1,
        auto_expand_replicas: '0-1',
      },
      lifecycle: {
        data_retention: '90d',
      },
      mappings,
    },
  };

  return indexTemplateBody;
}
