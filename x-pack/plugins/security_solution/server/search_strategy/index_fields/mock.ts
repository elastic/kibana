/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { FieldDescriptor } from '../../../../../../src/plugins/data/server/index_patterns';

export const mockAuditbeatIndexField: FieldDescriptor[] = [
  {
    name: '@timestamp',
    searchable: true,
    type: 'date',
    aggregatable: true,
    readFromDocValues: true,
    esTypes: [],
  },
  {
    name: 'agent.ephemeral_id',
    searchable: true,
    type: 'string',
    aggregatable: true,
    readFromDocValues: false,
    esTypes: [],
  },
  {
    name: 'agent.name',
    searchable: true,
    type: 'string',
    aggregatable: true,
    readFromDocValues: false,
    esTypes: [],
  },
  {
    name: 'agent.type',
    searchable: true,
    type: 'string',
    aggregatable: true,
    readFromDocValues: false,
    esTypes: [],
  },
  {
    name: 'agent.version',
    searchable: true,
    type: 'string',
    aggregatable: true,
    readFromDocValues: false,
    esTypes: [],
  },
];

export const mockFilebeatIndexField: FieldDescriptor[] = [
  {
    name: '@timestamp',
    searchable: true,
    type: 'date',
    aggregatable: true,
    readFromDocValues: true,
    esTypes: [],
  },
  {
    name: 'agent.hostname',
    searchable: true,
    type: 'string',
    aggregatable: true,
    readFromDocValues: false,
    esTypes: [],
  },
  {
    name: 'agent.name',
    searchable: true,
    type: 'string',
    aggregatable: true,
    readFromDocValues: false,
    esTypes: [],
  },
  {
    name: 'agent.version',
    searchable: true,
    type: 'string',
    aggregatable: true,
    readFromDocValues: false,
    esTypes: [],
  },
];

export const mockPacketbeatIndexField: FieldDescriptor[] = [
  {
    name: '@timestamp',
    searchable: true,
    type: 'date',
    aggregatable: true,
    readFromDocValues: true,
    esTypes: [],
  },
  {
    name: 'agent.id',
    searchable: true,
    type: 'string',
    aggregatable: true,
    readFromDocValues: false,
    esTypes: [],
  },
  {
    name: 'agent.type',
    searchable: true,
    type: 'string',
    aggregatable: true,
    readFromDocValues: false,
    esTypes: [],
  },
];
