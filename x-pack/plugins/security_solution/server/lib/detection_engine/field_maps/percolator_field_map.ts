/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// required to query the percolator index
const queryField = {
  query: {
    type: 'percolator',
    array: false,
    required: true,
  },
};

// required for threat matching a specific rule
const ruleFields = {
  rule_id: {
    type: 'keyword',
    array: false,
    required: true,
  },
  rule_version: {
    type: 'long',
    array: false,
    required: true,
  },
};

// experimental threat fields (all threat fields must be mapped)
const experimentalThreatFields = {
  'threat.feed.dashboard_id': {
    type: 'keyword',
    array: false,
    required: false,
  },
  'threat.feed.name': {
    type: 'keyword',
    array: false,
    required: false,
  },
};

// required for indicatorSearchAfter optimization
const searchAfterFields = {
  indicator_search_after_value: {
    type: 'long',
    array: true,
    required: false,
  },
  is_search_after_query: {
    type: 'boolean',
    array: false,
    required: false,
  },
};

export const percolatorFieldMap = {
  ...queryField,
  ...ruleFields,
  ...experimentalThreatFields,
  ...searchAfterFields,
};
