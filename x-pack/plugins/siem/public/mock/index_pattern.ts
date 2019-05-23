/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export const mockIndexPattern = {
  fields: [
    {
      name: '@timestamp',
      searchable: true,
      type: 'date',
      aggregatable: true,
    },
    {
      name: '@version',
      searchable: true,
      type: 'string',
      aggregatable: true,
    },
    {
      name: 'agent.ephemeral_id',
      searchable: true,
      type: 'string',
      aggregatable: true,
    },
    {
      name: 'agent.hostname',
      searchable: true,
      type: 'string',
      aggregatable: true,
    },
    {
      name: 'agent.id',
      searchable: true,
      type: 'string',
      aggregatable: true,
    },
    {
      name: 'agent.test1',
      searchable: true,
      type: 'string',
      aggregatable: true,
    },
    {
      name: 'agent.test2',
      searchable: true,
      type: 'string',
      aggregatable: true,
    },
    {
      name: 'agent.test3',
      searchable: true,
      type: 'string',
      aggregatable: true,
    },
    {
      name: 'agent.test4',
      searchable: true,
      type: 'string',
      aggregatable: true,
    },
    {
      name: 'agent.test5',
      searchable: true,
      type: 'string',
      aggregatable: true,
    },
    {
      name: 'agent.test6',
      searchable: true,
      type: 'string',
      aggregatable: true,
    },
    {
      name: 'agent.test7',
      searchable: true,
      type: 'string',
      aggregatable: true,
    },
    {
      name: 'agent.test8',
      searchable: true,
      type: 'string',
      aggregatable: true,
    },
  ],
  title: 'filebeat-*,auditbeat-*,packetbeat-*',
};
