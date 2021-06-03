/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { estypes } from '@elastic/elasticsearch';
import { IndexNames } from './index_names';
import { IndexMappings } from './index_mappings';

export type IndexTemplate = estypes.PutIndexTemplateRequest['body'];

export const createIndexTemplate = (
  names: IndexNames,
  mappings: IndexMappings,
  version: number
): IndexTemplate => {
  const { indexAliasName, indexAliasPattern, indexIlmPolicyName } = names;

  return {
    index_patterns: [indexAliasPattern],
    settings: {
      number_of_shards: 1, // TODO: do we need to set this?
      auto_expand_replicas: '0-1', // TODO: do we need to set?
      index: {
        lifecycle: {
          name: indexIlmPolicyName,
          rollover_alias: indexAliasName,
        },
      },
      mapping: {
        total_fields: {
          limit: 10000,
        },
      },
      sort: {
        field: '@timestamp',
        order: 'desc',
      },
    },
    mappings: {
      ...mappings,
      _meta: {
        ...mappings._meta,
        version,
      },
    },
    version,
  };
};
