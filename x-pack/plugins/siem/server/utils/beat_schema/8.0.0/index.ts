/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export { auditbeatSchema } from './auditbeat';
export { filebeatSchema } from './filebeat';
export { packetbeatSchema } from './packetbeat';
export { ecsSchema } from './ecs';

export const extraSchemaField = {
  _id: {
    description: 'Each document has an _id that uniquely identifies it',
    example: 'Y-6TfmcB0WOhS6qyMv3s',
    footnote: '',
    group: 1,
    level: 'core',
    name: '_id',
    required: true,
    type: 'keyword',
  },
  _index: {
    description:
      'An index is like a ‘database’ in a relational database. It has a mapping which defines multiple types. An index is a logical namespace which maps to one or more primary shards and can have zero or more replica shards.',
    example: 'auditbeat-8.0.0-2019.02.19-000001',
    footnote: '',
    group: 1,
    level: 'core',
    name: '_index',
    required: true,
    type: 'keyword',
  },
};

export const baseCategoryFields = ['@timestamp', 'labels', 'message', 'tags'];
