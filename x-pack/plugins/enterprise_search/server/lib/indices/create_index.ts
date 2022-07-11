/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MappingKeywordProperty, MappingTextProperty } from '@elastic/elasticsearch/lib/api/types';
import { IScopedClusterClient } from '@kbn/core/server';

import { textAnalysisSettings } from './text_analysis';

const prefixMapping: MappingTextProperty = {
  search_analyzer: 'q_prefix',
  analyzer: 'i_prefix',
  type: 'text',
  index_options: 'docs',
};

const delimiterMapping: MappingTextProperty = {
  analyzer: 'iq_text_delimiter',
  type: 'text',
  index_options: 'freqs',
};

const joinedMapping: MappingTextProperty = {
  search_analyzer: 'q_text_bigram',
  analyzer: 'i_text_bigram',
  type: 'text',
  index_options: 'freqs',
};

const enumMapping: MappingKeywordProperty = {
  ignore_above: 2048,
  type: 'keyword',
};

const stemMapping: MappingTextProperty = {
  analyzer: 'iq_text_stem',
  type: 'text',
};

const defaultMappings = {
  dynamic: true,
  dynamic_templates: [
    {
      all_text_fields: {
        match_mapping_type: 'string',
        mapping: {
          analyzer: 'iq_text_base',
          fields: {
            prefix: prefixMapping,
            delimiter: delimiterMapping,
            joined: joinedMapping,
            enum: enumMapping,
            stem: stemMapping,
          },
        },
      },
    },
  ],
};

export const createApiIndex = async (
  client: IScopedClusterClient,
  indexName: string,
  language: string | undefined
) => {
  return await client.asCurrentUser.indices.create({
    index: indexName,
    body: {
      mappings: defaultMappings,
      settings: textAnalysisSettings(language),
    },
  });
};
