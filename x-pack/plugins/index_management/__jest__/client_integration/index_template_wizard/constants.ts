/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export const TEMPLATE_NAME = 'my_template';

export const INDEX_PATTERNS = ['my_index_pattern'];

export const SETTINGS = {
  number_of_shards: 1,
  index: {
    lifecycle: {
      name: 'my_policy',
    },
  },
};

export const ALIASES = {
  alias: {
    filter: {
      term: { user: 'my_user' },
    },
  },
};

export const MAPPINGS = {
  properties: {},
};
