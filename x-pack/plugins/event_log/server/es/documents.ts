/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EsNames } from './names';
import mappings from '../../generated/mappings.json';

// returns the body of an index template used in an ES indices.putTemplate call
export function getIndexTemplate(esNames: EsNames) {
  const indexTemplateBody = {
    index_patterns: [esNames.indexPatternWithVersion],
    settings: {
      number_of_shards: 1,
      auto_expand_replicas: '0-1',
      'index.lifecycle.name': esNames.ilmPolicy,
      'index.lifecycle.rollover_alias': esNames.alias,
    },
    mappings,
  };

  return indexTemplateBody;
}

// returns the body of an ilm policy used in an ES PUT _ilm/policy call
export function getIlmPolicy() {
  return {
    policy: {
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
