/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const ELSER_PASSAGE_CHUNKED_TWO_INDICES_DOCS = [
  {
    _index: 'workplace_index',
    _id: '248629d8-64d7-4e91-a4eb-dbd8282d9f24',
    _score: 1,
    _ignored: ['metadata.summary.keyword', 'text.keyword'],
    _source: {
      metadata: {
        summary: 'This policy',
        rolePermissions: ['demo', 'manager'],
        name: 'Work From Home Policy',
      },
      vector: {
        tokens: {},
        model_id: '.elser_model_2',
      },
      text: 'Effective: March 2020',
    },
  },
  {
    _index: 'workplace_index2',
    _id: 'b047762c-24eb-4846-aeb5-808346d54c54',
    _score: 1,
    _ignored: ['content.keyword', 'metadata.summary.keyword'],
    _source: {
      metadata: {
        summary:
          'This policy outlines the guidelines for full-time remote work, including eligibility, equipment and resources, workspace requirements, communication expectations, performance expectations, time tracking and overtime, confidentiality and data security, health and well-being, and policy reviews and updates. Employees are encouraged to direct any questions or concerns',
        rolePermissions: ['demo', 'manager'],
        name: 'Work From Home Policy',
      },
      content: 'Effective',
      content_vector: {
        tokens: {},
        model_id: '.elser_model_2',
      },
    },
  },
];

export const ELSER_PASSAGE_CHUNKED_TWO_INDICES = {
  indices: ['workplace_index', 'workplace_index2'],
  fields: {
    'vector.tokens': {
      rank_features: {
        type: 'rank_features',
        metadata_field: false,
        searchable: true,
        aggregatable: false,
        indices: ['workplace_index'],
      },
      unmapped: {
        type: 'unmapped',
        metadata_field: false,
        searchable: false,
        aggregatable: false,
        indices: ['workplace_index2'],
      },
    },
    metadata: {
      object: {
        type: 'object',
        metadata_field: false,
        searchable: false,
        aggregatable: false,
      },
    },
    'metadata.rolePermissions.keyword': {
      keyword: {
        type: 'keyword',
        metadata_field: false,
        searchable: true,
        aggregatable: true,
      },
    },
    'metadata.name.keyword': {
      keyword: {
        type: 'keyword',
        metadata_field: false,
        searchable: true,
        aggregatable: true,
      },
    },
    'metadata.summary': {
      text: {
        type: 'text',
        metadata_field: false,
        searchable: true,
        aggregatable: false,
      },
    },
    'content_vector.tokens': {
      rank_features: {
        type: 'rank_features',
        metadata_field: false,
        searchable: true,
        aggregatable: false,
        indices: ['workplace_index2'],
      },
      unmapped: {
        type: 'unmapped',
        metadata_field: false,
        searchable: false,
        aggregatable: false,
        indices: ['workplace_index'],
      },
    },
    content: {
      unmapped: {
        type: 'unmapped',
        metadata_field: false,
        searchable: false,
        aggregatable: false,
        indices: ['workplace_index'],
      },
      text: {
        type: 'text',
        metadata_field: false,
        searchable: true,
        aggregatable: false,
        indices: ['workplace_index2'],
      },
    },
    'vector.model_id': {
      unmapped: {
        type: 'unmapped',
        metadata_field: false,
        searchable: false,
        aggregatable: false,
        indices: ['workplace_index2'],
      },
      text: {
        type: 'text',
        metadata_field: false,
        searchable: true,
        aggregatable: false,
        indices: ['workplace_index'],
      },
    },
    'content.keyword': {
      keyword: {
        type: 'keyword',
        metadata_field: false,
        searchable: true,
        aggregatable: true,
        indices: ['workplace_index2'],
      },
      unmapped: {
        type: 'unmapped',
        metadata_field: false,
        searchable: false,
        aggregatable: false,
        indices: ['workplace_index'],
      },
    },
    'content_vector.model_id.keyword': {
      keyword: {
        type: 'keyword',
        metadata_field: false,
        searchable: true,
        aggregatable: true,
        indices: ['workplace_index2'],
      },
      unmapped: {
        type: 'unmapped',
        metadata_field: false,
        searchable: false,
        aggregatable: false,
        indices: ['workplace_index'],
      },
    },
    'metadata.summary.keyword': {
      keyword: {
        type: 'keyword',
        metadata_field: false,
        searchable: true,
        aggregatable: true,
      },
    },
    'vector.model_id.keyword': {
      keyword: {
        type: 'keyword',
        metadata_field: false,
        searchable: true,
        aggregatable: true,
        indices: ['workplace_index'],
      },
      unmapped: {
        type: 'unmapped',
        metadata_field: false,
        searchable: false,
        aggregatable: false,
        indices: ['workplace_index2'],
      },
    },
    content_vector: {
      unmapped: {
        type: 'unmapped',
        metadata_field: false,
        searchable: false,
        aggregatable: false,
        indices: ['workplace_index'],
      },
      object: {
        type: 'object',
        metadata_field: false,
        searchable: false,
        aggregatable: false,
        indices: ['workplace_index2'],
      },
    },
    'metadata.rolePermissions': {
      text: {
        type: 'text',
        metadata_field: false,
        searchable: true,
        aggregatable: false,
      },
    },
    'content_vector.model_id': {
      unmapped: {
        type: 'unmapped',
        metadata_field: false,
        searchable: false,
        aggregatable: false,
        indices: ['workplace_index'],
      },
      text: {
        type: 'text',
        metadata_field: false,
        searchable: true,
        aggregatable: false,
        indices: ['workplace_index2'],
      },
    },
    vector: {
      unmapped: {
        type: 'unmapped',
        metadata_field: false,
        searchable: false,
        aggregatable: false,
        indices: ['workplace_index2'],
      },
      object: {
        type: 'object',
        metadata_field: false,
        searchable: false,
        aggregatable: false,
        indices: ['workplace_index'],
      },
    },
    'text.keyword': {
      keyword: {
        type: 'keyword',
        metadata_field: false,
        searchable: true,
        aggregatable: true,
        indices: ['workplace_index'],
      },
      unmapped: {
        type: 'unmapped',
        metadata_field: false,
        searchable: false,
        aggregatable: false,
        indices: ['workplace_index2'],
      },
    },
    text: {
      unmapped: {
        type: 'unmapped',
        metadata_field: false,
        searchable: false,
        aggregatable: false,
        indices: ['workplace_index2'],
      },
      text: {
        type: 'text',
        metadata_field: false,
        searchable: true,
        aggregatable: false,
        indices: ['workplace_index'],
      },
    },
    'metadata.name': {
      text: {
        type: 'text',
        metadata_field: false,
        searchable: true,
        aggregatable: false,
      },
    },
  },
};
