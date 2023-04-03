/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MappingRuntimeFields } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';

export const mocksSource = {
  indexFields: [
    {
      name: 'bytes',
      type: 'number',
      esTypes: ['long'],
      aggregatable: true,
      searchable: true,
      count: 10,
      readFromDocValues: true,
      scripted: false,
      isMapped: true,
    },
    {
      name: 'ssl',
      type: 'boolean',
      esTypes: ['boolean'],
      aggregatable: true,
      searchable: true,
      count: 20,
      readFromDocValues: true,
      scripted: false,
      isMapped: true,
    },
    {
      name: '@timestamp',
      type: 'date',
      esTypes: ['date'],
      aggregatable: true,
      searchable: true,
      count: 30,
      readFromDocValues: true,
      scripted: false,
      isMapped: true,
    },
  ],
};

export const mockIndexFields = [
  {
    aggregatable: true,
    name: '@timestamp',
    searchable: true,
    type: 'date',
    readFromDocValues: true,
  },
  { aggregatable: true, name: 'agent.ephemeral_id', searchable: true, type: 'string' },
  { aggregatable: true, name: 'agent.hostname', searchable: true, type: 'string' },
  { aggregatable: true, name: 'agent.id', searchable: true, type: 'string' },
  { aggregatable: true, name: 'agent.name', searchable: true, type: 'string' },
  { aggregatable: true, name: 'auditd.data.a0', searchable: true, type: 'string' },
  { aggregatable: true, name: 'auditd.data.a1', searchable: true, type: 'string' },
  { aggregatable: true, name: 'auditd.data.a2', searchable: true, type: 'string' },
  { aggregatable: true, name: 'client.address', searchable: true, type: 'string' },
  { aggregatable: true, name: 'client.bytes', searchable: true, type: 'number' },
  { aggregatable: true, name: 'client.domain', searchable: true, type: 'string' },
  { aggregatable: true, name: 'client.geo.country_iso_code', searchable: true, type: 'string' },
  { aggregatable: true, name: 'cloud.account.id', searchable: true, type: 'string' },
  { aggregatable: true, name: 'cloud.availability_zone', searchable: true, type: 'string' },
  { aggregatable: true, name: 'container.id', searchable: true, type: 'string' },
  { aggregatable: true, name: 'container.image.name', searchable: true, type: 'string' },
  { aggregatable: true, name: 'container.image.tag', searchable: true, type: 'string' },
  { aggregatable: true, name: 'destination.address', searchable: true, type: 'string' },
  { aggregatable: true, name: 'destination.bytes', searchable: true, type: 'number' },
  { aggregatable: true, name: 'destination.domain', searchable: true, type: 'string' },
  { aggregatable: true, name: 'destination.ip', searchable: true, type: 'ip' },
  { aggregatable: true, name: 'destination.port', searchable: true, type: 'long' },
  { aggregatable: true, name: 'source.ip', searchable: true, type: 'ip' },
  { aggregatable: true, name: 'source.port', searchable: true, type: 'long' },
  { aggregatable: true, name: 'event.end', searchable: true, type: 'date' },
];

export const mockRuntimeMappings: MappingRuntimeFields = {
  '@a.runtime.field': {
    script: {
      source: 'emit("Radical dude: " + doc[\'host.name\'].value)',
    },
    type: 'keyword',
  },
};
