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
        'index.lifecycle.name': esNames.ilmPolicy,
      },
      mappings,
    },
  };

  return indexTemplateBody;
}

// returns the body of an ilm policy used in an ES PUT _ilm/policy call
export function getIlmPolicy() {
  return {
    policy: {
      _meta: {
        description:
          'ilm policy the Kibana event log, created initially by Kibana, but updated by the user, not Kibana',
        managed: false,
      },
      phases: {
        hot: {
          actions: {
            rollover: {
              max_size: '50GB',
              max_age: '30d',
              // max_docs: 1, // you know, for testing
            },
          },
        },
        delete: {
          min_age: '90d',
          actions: {
            delete: {},
          },
        },
      },
    },
  };
}
