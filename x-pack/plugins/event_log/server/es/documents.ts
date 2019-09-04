/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EsNames } from './names';
import mappings from '../../generated/mappings.json';

export function getIndexTemplate(esNames: EsNames, ilmExists: boolean) {
  const indexTemplateBody: any = {
    index_patterns: [esNames.indexPattern],
    aliases: {
      [esNames.alias]: {},
    },
    settings: {
      number_of_shards: 1,
      number_of_replicas: 1,
      'index.lifecycle.name': esNames.ilmPolicy,
      'index.lifecycle.rollover_alias': esNames.alias,
    },
    mappings,
  };

  if (!ilmExists) {
    delete indexTemplateBody.settings['index.lifecycle.name'];
    delete indexTemplateBody.settings['index.lifecycle.rollover_alias'];
  }

  return indexTemplateBody;
}

export function getIlmPolicy() {
  return {
    policy: {
      phases: {
        hot: {
          actions: {
            rollover: {
              max_size: '5GB',
              max_age: '30d',
              // max_docs: 1, // you know, for testing
            },
          },
        },
      },
    },
  };
}
