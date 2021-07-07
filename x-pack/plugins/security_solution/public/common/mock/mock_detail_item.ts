/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TimelineEventsDetailsItem } from '../../../common/search_strategy';

export const mockDetailItemDataId = 'Y-6TfmcB0WOhS6qyMv3s';

export const generateMockDetailItemData = (): TimelineEventsDetailsItem[] => [
  {
    field: '_id',
    originalValue: 'pEMaMmkBUV60JmNWmWVi',
    values: ['pEMaMmkBUV60JmNWmWVi'],
    isObjectArray: false,
  },
  {
    field: '_index',
    originalValue: 'filebeat-8.0.0-2019.02.19-000001',
    values: ['filebeat-8.0.0-2019.02.19-000001'],
    isObjectArray: false,
  },
  {
    field: '_type',
    originalValue: '_doc',
    values: ['_doc'],
    isObjectArray: false,
  },
  {
    field: '_score',
    originalValue: 1,
    values: ['1'],
    isObjectArray: false,
  },
  {
    field: '@timestamp',
    originalValue: '2019-02-28T16:50:54.621Z',
    values: ['2019-02-28T16:50:54.621Z'],
    isObjectArray: false,
  },
  {
    field: 'agent.ephemeral_id',
    originalValue: '9d391ef2-a734-4787-8891-67031178c641',
    values: ['9d391ef2-a734-4787-8891-67031178c641'],
    isObjectArray: false,
  },
  {
    field: 'agent.hostname',
    originalValue: 'siem-kibana',
    values: ['siem-kibana'],
    isObjectArray: false,
  },
  {
    field: 'cloud.project.id',
    originalValue: 'elastic-beats',
    values: ['elastic-beats'],
    isObjectArray: false,
  },
  {
    field: 'cloud.provider',
    originalValue: 'gce',
    values: ['gce'],
    isObjectArray: false,
  },
  {
    field: 'destination.bytes',
    originalValue: 584,
    values: ['584'],
    isObjectArray: false,
  },
  {
    field: 'destination.ip',
    originalValue: '10.47.8.200',
    values: ['10.47.8.200'],
    isObjectArray: false,
  },
  {
    field: 'agent.id',
    originalValue: '5de03d5f-52f3-482e-91d4-853c7de073c3',
    values: ['5de03d5f-52f3-482e-91d4-853c7de073c3'],
    isObjectArray: false,
  },
  {
    field: 'cloud.instance.name',
    originalValue: 'siem-kibana',
    values: ['siem-kibana'],
    isObjectArray: false,
  },
  {
    field: 'cloud.machine.type',
    originalValue: 'projects/189716325846/machineTypes/n1-standard-1',
    values: ['projects/189716325846/machineTypes/n1-standard-1'],
    isObjectArray: false,
  },
  {
    field: 'agent.type',
    originalValue: 'filebeat',
    values: ['filebeat'],
    isObjectArray: false,
  },
  {
    field: 'destination.packets',
    originalValue: 4,
    values: ['4'],
    isObjectArray: false,
  },
  {
    field: 'destination.port',
    originalValue: 902,
    values: ['902'],
    isObjectArray: false,
  },
  {
    field: 'event.kind',
    originalValue: 'event',
    values: ['event'],
    isObjectArray: false,
  },
  {
    field: 'agent.version',
    originalValue: '8.0.0',
    values: ['8.0.0'],
    isObjectArray: false,
  },
  {
    field: 'cloud.availability_zone',
    originalValue: 'projects/189716325846/zones/us-east1-b',
    values: ['projects/189716325846/zones/us-east1-b'],
    isObjectArray: false,
  },
  {
    field: 'cloud.instance.id',
    originalValue: '5412578377715150143',
    values: ['5412578377715150143'],
    isObjectArray: false,
  },
];

export const mockDetailItemData: TimelineEventsDetailsItem[] = generateMockDetailItemData();
