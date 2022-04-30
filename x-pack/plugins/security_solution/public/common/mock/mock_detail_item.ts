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

export const rawEventData = {
  _index: '.ds-logs-endpoint.events.network-default-2021.09.28-000001',
  _id: 'TUWyf3wBFCFU0qRJTauW',
  _score: 1,
  _source: {
    agent: {
      id: '2ac9e9b3-f6d5-4ce6-915d-8f1f8f413624',
      type: 'endpoint',
      version: '8.0.0-SNAPSHOT',
    },
    process: {
      Ext: {
        ancestry: [
          'MmFjOWU5YjMtZjZkNS00Y2U2LTkxNWQtOGYxZjhmNDEzNjI0LTIyMzY0LTEzMjc4NjA2NTAyLjA=',
          'MmFjOWU5YjMtZjZkNS00Y2U2LTkxNWQtOGYxZjhmNDEzNjI0LTEtMTMyNzA3Njg2OTIuMA==',
        ],
      },
      name: 'filebeat',
      pid: 22535,
      entity_id: 'MmFjOWU5YjMtZjZkNS00Y2U2LTkxNWQtOGYxZjhmNDEzNjI0LTIyNTM1LTEzMjc4NjA2NTI4LjA=',
      executable:
        '/opt/Elastic/Agent/data/elastic-agent-058c40/install/filebeat-8.0.0-SNAPSHOT-linux-x86_64/filebeat',
    },
    destination: {
      address: '127.0.0.1',
      port: 9200,
      ip: '127.0.0.1',
    },
    source: {
      address: '127.0.0.1',
      port: 54146,
      ip: '127.0.0.1',
    },
    message: 'Endpoint network event',
    network: {
      transport: 'tcp',
      type: 'ipv4',
    },
    '@timestamp': '2021-10-14T16:45:58.0310772Z',
    ecs: {
      version: '1.11.0',
    },
    data_stream: {
      namespace: 'default',
      type: 'logs',
      dataset: 'endpoint.events.network',
    },
    elastic: {
      agent: {
        id: '12345',
      },
    },
    host: {
      hostname: 'test-linux-1',
      os: {
        Ext: {
          variant: 'Debian',
        },
        kernel: '4.19.0-17-cloud-amd64 #1 SMP Debian 4.19.194-2 (2021-06-21)',
        name: 'Linux',
        family: 'debian',
        type: 'linux',
        version: '10',
        platform: 'debian',
        full: 'Debian 10',
      },
      ip: ['127.0.0.1', '::1', '10.1.2.3', '2001:0DB8:AC10:FE01::'],
      name: 'test-linux-1',
      id: '76ea303129f249aa7382338e4263eac1',
      mac: ['aa:bb:cc:dd:ee:ff'],
      architecture: 'x86_64',
    },
    event: {
      agent_id_status: 'verified',
      sequence: 44872,
      ingested: '2021-10-14T16:46:04Z',
      created: '2021-10-14T16:45:58.0310772Z',
      kind: 'event',
      module: 'endpoint',
      action: 'connection_attempted',
      id: 'MKPXftjGeHiQzUNj++++nn6R',
      category: ['network'],
      type: ['start'],
      dataset: 'endpoint.events.network',
      outcome: 'unknown',
    },
    user: {
      Ext: {
        real: {
          name: 'root',
          id: 0,
        },
      },
      name: 'root',
      id: 0,
    },
    group: {
      Ext: {
        real: {
          name: 'root',
          id: 0,
        },
      },
      name: 'root',
      id: 0,
    },
  },
  fields: {
    'host.os.full.text': ['Debian 10'],
    'event.category': ['network'],
    'process.name.text': ['filebeat'],
    'host.os.name.text': ['Linux'],
    'host.os.full': ['Debian 10'],
    'host.hostname': ['test-linux-1'],
    'process.pid': [22535],
    'host.mac': ['42:01:0a:c8:00:32'],
    'elastic.agent.id': ['abcdefg-f6d5-4ce6-915d-8f1f8f413624'],
    'host.os.version': ['10'],
    'host.os.name': ['Linux'],
    'source.ip': ['127.0.0.1'],
    'destination.address': ['127.0.0.1'],
    'host.name': ['test-linux-1'],
    'event.agent_id_status': ['verified'],
    'event.kind': ['event'],
    'event.outcome': ['unknown'],
    'group.name': ['root'],
    'user.id': ['0'],
    'host.os.type': ['linux'],
    'process.Ext.ancestry': [
      'MmFjOWU5YjMtZjZkNS00Y2U2LTkxNWQtOGYxZjhmNDEzNjI0LTIyMzY0LTEzMjc4NjA2NTAyLjA=',
      'MmFjOWU5YjMtZjZkNS00Y2U2LTkxNWQtOGYxZjhmNDEzNjI0LTEtMTMyNzA3Njg2OTIuMA==',
    ],
    'user.Ext.real.id': ['0'],
    'data_stream.type': ['logs'],
    'host.architecture': ['x86_64'],
    'process.name': ['filebeat'],
    'agent.id': ['2ac9e9b3-f6d5-4ce6-915d-8f1f8f413624'],
    'source.port': [54146],
    'ecs.version': ['1.11.0'],
    'event.created': ['2021-10-14T16:45:58.031Z'],
    'agent.version': ['8.0.0-SNAPSHOT'],
    'host.os.family': ['debian'],
    'destination.port': [9200],
    'group.id': ['0'],
    'user.name': ['root'],
    'source.address': ['127.0.0.1'],
    'process.entity_id': [
      'MmFjOWU5YjMtZjZkNS00Y2U2LTkxNWQtOGYxZjhmNDEzNjI0LTIyNTM1LTEzMjc4NjA2NTI4LjA=',
    ],
    'host.ip': ['127.0.0.1', '::1', '10.1.2.3', '2001:0DB8:AC10:FE01::'],
    'process.executable.caseless': [
      '/opt/elastic/agent/data/elastic-agent-058c40/install/filebeat-8.0.0-snapshot-linux-x86_64/filebeat',
    ],
    'event.sequence': [44872],
    'agent.type': ['endpoint'],
    'process.executable.text': [
      '/opt/Elastic/Agent/data/elastic-agent-058c40/install/filebeat-8.0.0-SNAPSHOT-linux-x86_64/filebeat',
    ],
    'group.Ext.real.name': ['root'],
    'event.module': ['endpoint'],
    'host.os.kernel': ['4.19.0-17-cloud-amd64 #1 SMP Debian 4.19.194-2 (2021-06-21)'],
    'host.os.full.caseless': ['debian 10'],
    'host.id': ['76ea303129f249aa7382338e4263eac1'],
    'process.name.caseless': ['filebeat'],
    'network.type': ['ipv4'],
    'process.executable': [
      '/opt/Elastic/Agent/data/elastic-agent-058c40/install/filebeat-8.0.0-SNAPSHOT-linux-x86_64/filebeat',
    ],
    'user.Ext.real.name': ['root'],
    'data_stream.namespace': ['default'],
    message: ['Endpoint network event'],
    'destination.ip': ['127.0.0.1'],
    'network.transport': ['tcp'],
    'host.os.Ext.variant': ['Debian'],
    'group.Ext.real.id': ['0'],
    'event.ingested': ['2021-10-14T16:46:04.000Z'],
    'event.action': ['connection_attempted'],
    '@timestamp': ['2021-10-14T16:45:58.031Z'],
    'host.os.platform': ['debian'],
    'data_stream.dataset': ['endpoint.events.network'],
    'event.type': ['start'],
    'event.id': ['MKPXftjGeHiQzUNj++++nn6R'],
    'host.os.name.caseless': ['linux'],
    'event.dataset': ['endpoint.events.network'],
    'user.name.text': ['root'],
  },
};
