/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
export const RELATED_ECS_FIELDS = {
  'related.hash': {
    type: 'keyword',
    description: 'All the hashes seen in the docs',
    note: 'this field should contain an array of values',
  },
  'related.hosts': {
    type: 'keyword',
    description: 'All hostnames or other host identifiers seen in the docs',
    note: 'this field should contain an array of values',
  },
  'related.ip': {
    type: 'keyword',
    description: 'All of the IPs seen in the docs',
    note: 'this field should contain an array of values',
  },
  'related.user': {
    type: 'keyword',
    description: 'All the user names or other user identifiers seen in the docs',
    note: 'this field should contain an array of values',
  },
};

export const RELATED_EXAMPLE_ANSWER = [
  {
    append: {
      field: 'related.ip',
      value: ['{{{source.ip}}}'],
      allow_duplicates: 'false',
    },
  },
  {
    append: {
      field: 'related.user',
      value: ['{{{server.user.name}}}'],
      allow_duplicates: 'false',
    },
  },
  {
    append: {
      field: 'related.hosts',
      value: ['{{{client.domain}}}'],
      allow_duplicates: 'false',
    },
  },
  {
    append: {
      field: 'related.hash',
      value: ['{{{file.hash.sha1}}}'],
      allow_duplicates: 'false',
    },
  },
];
