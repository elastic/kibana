/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import type { ResolverNode } from '../../../../common/endpoint/types';

export const stubEndpointAlertResponse = () => {
  return {
    took: 0,
    timed_out: false,
    _shards: {
      total: 1,
      successful: 1,
      skipped: 0,
      failed: 0,
    },
    hits: {
      total: {
        value: 1,
        relation: 'eq',
      },
      max_score: 0,
      hits: [
        {
          _index: '.internal.alerts-security.alerts-default-000001',
          _id: '2f4c790211998ec3369f581b778e9761ae5647d041edd7b1245f7311fba06f37',
          _score: 0,
          _source: {
            'kibana.alert.rule.category': 'Custom Query Rule',
            'kibana.alert.rule.consumer': 'siem',
            'kibana.alert.rule.execution.uuid': 'c92c1a91-9981-4948-8dee-39b263d81f05',
            'kibana.alert.rule.name': 'Endpoint Security',
            'kibana.alert.rule.producer': 'siem',
            'kibana.alert.rule.rule_type_id': 'siem.queryRule',
            'kibana.alert.rule.uuid': 'b35e3af8-da87-11ec-ad90-353e53c6bd3e',
            'kibana.space_ids': ['default'],
            'kibana.alert.rule.tags': ['Elastic', 'Endpoint Security'],
            '@timestamp': moment.now(),
            registry: {
              path: 'HKEY_USERS\\S-1-5-21-2460036010-3910878774-3458087990-1001\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Run\\chrome',
              data: {
                strings: 'C:/fake_behavior/explorer.exe',
              },
              value: 'explorer.exe',
            },
            agent: {
              id: 'd2529c31-5415-492a-9c9b-87a77e8874d5',
              type: 'endpoint',
              version: '7.0.1',
            },
            process: {
              Ext: {
                ancestry: ['j0mdzksneq', 'up4f1f87wr'],
                code_signature: [
                  {
                    trusted: false,
                    subject_name: 'bad signer',
                  },
                ],
                user: 'SYSTEM',
                token: {
                  integrity_level_name: 'high',
                  elevation_level: 'full',
                },
              },
              parent: {
                pid: 1,
                entity_id: 'j0mdzksneq',
              },
              group_leader: {
                name: 'fake leader',
                pid: 112,
                entity_id: '3po060bfqd',
              },
              session_leader: {
                name: 'fake session',
                pid: 7,
                entity_id: '3po060bfqd',
              },
              code_signature: {
                subject_name: 'Microsoft Windows',
                status: 'trusted',
              },
              entry_leader: {
                name: 'fake entry',
                pid: 139,
                entity_id: '3po060bfqd',
              },
              name: 'explorer.exe',
              pid: 2,
              entity_id: 'p1dbx787xe',
              executable: 'C:/fake_behavior/explorer.exe',
            },
            dll: [
              {
                Ext: {
                  compile_time: 1534424710,
                  malware_classification: {
                    identifier: 'Whitelisted',
                    score: 0,
                    threshold: 0,
                    version: '3.0.0',
                  },
                  mapped_address: 5362483200,
                  mapped_size: 0,
                },
                path: 'C:\\Program Files\\Cybereason ActiveProbe\\AmSvc.exe',
                code_signature: {
                  trusted: true,
                  subject_name: 'Cybereason Inc',
                },
                pe: {
                  architecture: 'x64',
                },
                hash: {
                  sha1: 'ca85243c0af6a6471bdaa560685c51eefd6dbc0d',
                  sha256: '8ad40c90a611d36eb8f9eb24fa04f7dbca713db383ff55a03aa0f382e92061a2',
                  md5: '1f2d082566b0fc5f2c238a5180db7451',
                },
              },
            ],
            destination: {
              port: 443,
              ip: '10.39.10.58',
            },
            rule: {
              description: 'Behavior rule description',
              id: 'e2d719cc-7044-4a46-b2ee-0a2993202096',
            },
            source: {
              port: 59406,
              ip: '10.199.40.10',
            },
            network: {
              transport: 'tcp',
              type: 'ipv4',
              direction: 'outgoing',
            },
            file: {
              path: 'C:/fake_behavior.exe',
              name: 'fake_behavior.exe',
            },
            ecs: {
              version: '1.6.0',
            },
            data_stream: {
              namespace: 'default',
              type: 'logs',
              dataset: 'endpoint.alerts',
            },
            elastic: {
              agent: {
                id: 'd2529c31-5415-492a-9c9b-87a77e8874d5',
              },
            },
            host: {
              hostname: 'Host-uu8vmc2z8a',
              os: {
                Ext: {
                  variant: 'Windows Server',
                },
                name: 'Windows',
                family: 'windows',
                version: '10.0',
                platform: 'Windows',
                full: 'Windows Server 2016',
              },
              ip: ['10.23.178.108'],
              name: 'Host-uu8vmc2z8a',
              id: 'c1e90e16-0130-46d4-88de-ee338f13fed7',
              mac: ['ee-83-79-cf-1a-13', 'a7-79-da-62-9e-78'],
              architecture: 'a4rwx2t7yu',
            },
            'event.agent_id_status': 'auth_metadata_missing',
            'event.sequence': 15,
            'event.ingested': '2022-05-23T11:02:53Z',
            'event.code': 'behavior',
            'event.kind': 'signal',
            'event.module': 'endpoint',
            'event.action': 'rule_detection',
            'event.id': '962dba31-1306-4bb1-82c2-2a6d9ef8962d',
            'event.category': 'behavior',
            'event.type': 'info',
            'event.dataset': 'endpoint.diagnostic.collection',
            'kibana.alert.original_time': '2022-05-23T11:02:59.511Z',
            'kibana.alert.ancestors': [
              {
                id: 'juKV8IABsphBWHn-nT4H',
                type: 'event',
                index: '.ds-logs-endpoint.alerts-default-2022.05.23-000001',
                depth: 0,
              },
            ],
            'kibana.alert.status': 'active',
            'kibana.alert.workflow_status': 'open',
            'kibana.alert.depth': 1,
            'kibana.alert.reason':
              'behavior event with process explorer.exe, file fake_behavior.exe,:59406,:443, on Host-uu8vmc2z8a created medium alert Endpoint Security.',
            'kibana.alert.severity': 'medium',
            'kibana.alert.risk_score': 47,
            'kibana.alert.rule.actions': [],
            'kibana.alert.rule.author': ['Elastic'],
            'kibana.alert.rule.created_at': '2022-05-23T11:01:34.044Z',
            'kibana.alert.rule.created_by': 'elastic',
            'kibana.alert.rule.description':
              'Generates a detection alert each time an Elastic Endpoint Security alert is received. Enabling this rule allows you to immediately begin investigating your Endpoint alerts.',
            'kibana.alert.rule.enabled': true,
            'kibana.alert.rule.exceptions_list': [
              {
                id: 'endpoint_list',
                list_id: 'endpoint_list',
                namespace_type: 'agnostic',
                type: 'endpoint',
              },
            ],
            'kibana.alert.rule.false_positives': [],
            'kibana.alert.rule.from': 'now-10m',
            'kibana.alert.rule.immutable': true,
            'kibana.alert.rule.interval': '5m',
            'kibana.alert.rule.license': 'Elastic License v2',
            'kibana.alert.rule.max_signals': 10000,
            'kibana.alert.rule.references': [],
            'kibana.alert.rule.risk_score_mapping': [
              {
                field: 'event.risk_score',
                operator: 'equals',
                value: '',
              },
            ],
            'kibana.alert.rule.rule_id': '9a1a2dae-0b5f-4c3d-8305-a268d404c306',
            'kibana.alert.rule.rule_name_override': 'message',
            'kibana.alert.rule.severity_mapping': [
              {
                field: 'event.severity',
                operator: 'equals',
                severity: 'low',
                value: '21',
              },
              {
                field: 'event.severity',
                operator: 'equals',
                severity: 'medium',
                value: '47',
              },
              {
                field: 'event.severity',
                operator: 'equals',
                severity: 'high',
                value: '73',
              },
              {
                field: 'event.severity',
                operator: 'equals',
                severity: 'critical',
                value: '99',
              },
            ],
            'kibana.alert.rule.threat': [],
            'kibana.alert.rule.timestamp_override': 'event.ingested',
            'kibana.alert.rule.to': 'now',
            'kibana.alert.rule.type': 'query',
            'kibana.alert.rule.updated_at': '2022-05-23T11:01:34.044Z',
            'kibana.alert.rule.updated_by': 'elastic',
            'kibana.alert.rule.version': 3,
            'kibana.alert.rule.risk_score': 47,
            'kibana.alert.rule.severity': 'medium',
            'kibana.alert.original_event.agent_id_status': 'auth_metadata_missing',
            'kibana.alert.original_event.sequence': 15,
            'kibana.alert.original_event.ingested': '2022-05-23T11:02:53Z',
            'kibana.alert.original_event.code': 'behavior',
            'kibana.alert.original_event.kind': 'alert',
            'kibana.alert.original_event.module': 'endpoint',
            'kibana.alert.original_event.action': 'rule_detection',
            'kibana.alert.original_event.id': '962dba31-1306-4bb1-82c2-2a6d9ef8962d',
            'kibana.alert.original_event.category': 'behavior',
            'kibana.alert.original_event.type': 'info',
            'kibana.alert.original_event.dataset': 'endpoint.diagnostic.collection',
            'kibana.alert.uuid': '2f4c790211998ec3369f581b778e9761ae5647d041edd7b1245f7311fba06f37',
          },
        },
      ],
    },
    aggregations: {
      endpoint_alert_count: {
        value: 1,
      },
    },
  };
};

export const stubProcessTree = (): ResolverNode[] => [
  {
    id: 'p1dbx787xe',
    parent: 'j0mdzksneq',
    name: 'explorer.exe',
    data: {
      'process.name': ['explorer.exe'],
      '@timestamp': ['2022-05-23T11:02:57.511Z'],
      'process.parent.entity_id': ['j0mdzksneq'],
      'process.Ext.ancestry': ['j0mdzksneq', 'up4f1f87wr'],
      'process.entity_id': ['p1dbx787xe'],
    },
    stats: {
      total: 0,
      byCategory: {},
    },
  },
  {
    id: 'up4f1f87wr',
    parent: '3po060bfqd',
    name: 'notepad.exe',
    data: {
      'process.name': ['notepad.exe'],
      '@timestamp': ['2022-05-23T11:02:55.511Z'],
      'process.parent.entity_id': ['3po060bfqd'],
      'process.Ext.ancestry': ['3po060bfqd'],
      'process.entity_id': ['up4f1f87wr'],
    },
    stats: {
      total: 5,
      byCategory: {
        registry: 2,
        authentication: 1,
        driver: 1,
        network: 1,
        session: 1,
      },
    },
  },
  {
    id: 'j0mdzksneq',
    parent: 'up4f1f87wr',
    name: 'notepad.exe',
    data: {
      'process.name': ['notepad.exe'],
      '@timestamp': ['2022-05-23T11:02:56.511Z'],
      'process.parent.entity_id': ['up4f1f87wr'],
      'process.Ext.ancestry': ['3po060bfqd', 'up4f1f87wr'],
      'process.entity_id': ['j0mdzksneq'],
    },
    stats: {
      total: 0,
      byCategory: {},
    },
  },
  {
    id: '3po060bfqd',
    name: 'mimikatz.exe',
    data: {
      'process.name': ['mimikatz.exe'],
      '@timestamp': ['2022-05-23T11:02:54.511Z'],
      'process.entity_id': ['3po060bfqd'],
    },
    stats: {
      total: 0,
      byCategory: {},
    },
  },
  {
    id: '72221vhp1s',
    parent: 'p1dbx787xe',
    name: 'lsass.exe',
    data: {
      'process.name': ['lsass.exe'],
      '@timestamp': ['2022-05-23T11:03:00.511Z'],
      'process.parent.entity_id': ['p1dbx787xe'],
      'process.Ext.ancestry': ['j0mdzksneq', 'p1dbx787xe'],
      'process.entity_id': ['72221vhp1s'],
    },
    stats: {
      total: 0,
      byCategory: {},
    },
  },
  {
    id: 'o055ylvrqg',
    parent: 'p1dbx787xe',
    name: 'powershell.exe',
    data: {
      'process.name': ['powershell.exe'],
      '@timestamp': ['2022-05-23T11:03:09.511Z'],
      'process.parent.entity_id': ['p1dbx787xe'],
      'process.Ext.ancestry': ['j0mdzksneq', 'p1dbx787xe'],
      'process.entity_id': ['o055ylvrqg'],
    },
    stats: {
      total: 0,
      byCategory: {},
    },
  },
  {
    id: 'kemjvigx5w',
    parent: 'p1dbx787xe',
    name: 'notepad.exe',
    data: {
      'process.name': ['notepad.exe'],
      '@timestamp': ['2022-05-23T11:03:14.511Z'],
      'process.parent.entity_id': ['p1dbx787xe'],
      'process.Ext.ancestry': ['j0mdzksneq', 'p1dbx787xe'],
      'process.entity_id': ['kemjvigx5w'],
    },
    stats: {
      total: 0,
      byCategory: {},
    },
  },
  {
    id: '9xtipos591',
    parent: '72221vhp1s',
    name: 'iexlorer.exe',
    data: {
      'process.name': ['iexlorer.exe'],
      '@timestamp': ['2022-05-23T11:03:01.511Z'],
      'process.parent.entity_id': ['72221vhp1s'],
      'process.Ext.ancestry': ['72221vhp1s', 'p1dbx787xe'],
      'process.entity_id': ['9xtipos591'],
    },
    stats: {
      total: 0,
      byCategory: {},
    },
  },
  {
    id: 'spk93ihzue',
    parent: '72221vhp1s',
    name: 'explorer.exe',
    data: {
      'process.name': ['explorer.exe'],
      '@timestamp': ['2022-05-23T11:03:02.511Z'],
      'process.parent.entity_id': ['72221vhp1s'],
      'process.Ext.ancestry': ['72221vhp1s', 'p1dbx787xe'],
      'process.entity_id': ['spk93ihzue'],
    },
    stats: {
      total: 0,
      byCategory: {},
    },
  },
  {
    id: 'eefk3v3tg0',
    parent: '72221vhp1s',
    name: 'iexlorer.exe',
    data: {
      'process.name': ['iexlorer.exe'],
      '@timestamp': ['2022-05-23T11:03:05.511Z'],
      'process.parent.entity_id': ['72221vhp1s'],
      'process.Ext.ancestry': ['72221vhp1s', 'p1dbx787xe'],
      'process.entity_id': ['eefk3v3tg0'],
    },
    stats: {
      total: 0,
      byCategory: {},
    },
  },
  {
    id: 'z7t7ai4mcl',
    parent: 'o055ylvrqg',
    name: 'powershell.exe',
    data: {
      'process.name': ['powershell.exe'],
      '@timestamp': ['2022-05-23T11:03:10.511Z'],
      'process.parent.entity_id': ['o055ylvrqg'],
      'process.Ext.ancestry': ['o055ylvrqg', 'p1dbx787xe'],
      'process.entity_id': ['z7t7ai4mcl'],
    },
    stats: {
      total: 1,
      byCategory: {
        network: 1,
      },
    },
  },
  {
    id: '33k536gv9n',
    parent: 'o055ylvrqg',
    name: 'mimikatz.exe',
    data: {
      'process.name': ['mimikatz.exe'],
      '@timestamp': ['2022-05-23T11:03:11.511Z'],
      'process.parent.entity_id': ['o055ylvrqg'],
      'process.Ext.ancestry': ['o055ylvrqg', 'p1dbx787xe'],
      'process.entity_id': ['33k536gv9n'],
    },
    stats: {
      total: 5,
      byCategory: {
        file: 4,
        network: 1,
      },
    },
  },
  {
    id: 'tbxjoicr50',
    parent: 'kemjvigx5w',
    name: 'iexlorer.exe',
    data: {
      'process.name': ['iexlorer.exe'],
      '@timestamp': ['2022-05-23T11:03:15.511Z'],
      'process.parent.entity_id': ['kemjvigx5w'],
      'process.Ext.ancestry': ['kemjvigx5w', 'p1dbx787xe'],
      'process.entity_id': ['tbxjoicr50'],
    },
    stats: {
      total: 5,
      byCategory: {
        authentication: 2,
        driver: 2,
        session: 2,
        file: 1,
      },
    },
  },
  {
    id: '4kdvfoj2u9',
    parent: 'kemjvigx5w',
    name: 'notepad.exe',
    data: {
      'process.name': ['notepad.exe'],
      '@timestamp': ['2022-05-23T11:03:17.511Z'],
      'process.parent.entity_id': ['kemjvigx5w'],
      'process.Ext.ancestry': ['kemjvigx5w', 'p1dbx787xe'],
      'process.entity_id': ['4kdvfoj2u9'],
    },
    stats: {
      total: 0,
      byCategory: {},
    },
  },
  {
    id: 'lfgmzmj99j',
    parent: 'kemjvigx5w',
    name: 'powershell.exe',
    data: {
      'process.name': ['powershell.exe'],
      '@timestamp': ['2022-05-23T11:03:19.511Z'],
      'process.parent.entity_id': ['kemjvigx5w'],
      'process.Ext.ancestry': ['kemjvigx5w', 'p1dbx787xe'],
      'process.entity_id': ['lfgmzmj99j'],
    },
    stats: {
      total: 0,
      byCategory: {},
    },
  },
  {
    id: '9xtipos591',
    parent: '72221vhp1s',
    name: 'iexlorer.exe',
    data: {
      'process.name': ['iexlorer.exe'],
      '@timestamp': ['2022-05-23T11:03:01.511Z'],
      'process.parent.entity_id': ['72221vhp1s'],
      'process.Ext.ancestry': ['72221vhp1s', 'p1dbx787xe'],
      'process.entity_id': ['9xtipos591'],
    },
    stats: {
      total: 0,
      byCategory: {},
    },
  },
  {
    id: 'spk93ihzue',
    parent: '72221vhp1s',
    name: 'explorer.exe',
    data: {
      'process.name': ['explorer.exe'],
      '@timestamp': ['2022-05-23T11:03:02.511Z'],
      'process.parent.entity_id': ['72221vhp1s'],
      'process.Ext.ancestry': ['72221vhp1s', 'p1dbx787xe'],
      'process.entity_id': ['spk93ihzue'],
    },
    stats: {
      total: 0,
      byCategory: {},
    },
  },
  {
    id: 'eefk3v3tg0',
    parent: '72221vhp1s',
    name: 'iexlorer.exe',
    data: {
      'process.name': ['iexlorer.exe'],
      '@timestamp': ['2022-05-23T11:03:05.511Z'],
      'process.parent.entity_id': ['72221vhp1s'],
      'process.Ext.ancestry': ['72221vhp1s', 'p1dbx787xe'],
      'process.entity_id': ['eefk3v3tg0'],
    },
    stats: {
      total: 0,
      byCategory: {},
    },
  },
  {
    id: 'z7t7ai4mcl',
    parent: 'o055ylvrqg',
    name: 'powershell.exe',
    data: {
      'process.name': ['powershell.exe'],
      '@timestamp': ['2022-05-23T11:03:10.511Z'],
      'process.parent.entity_id': ['o055ylvrqg'],
      'process.Ext.ancestry': ['o055ylvrqg', 'p1dbx787xe'],
      'process.entity_id': ['z7t7ai4mcl'],
    },
    stats: {
      total: 1,
      byCategory: {
        network: 1,
      },
    },
  },
  {
    id: '33k536gv9n',
    parent: 'o055ylvrqg',
    name: 'mimikatz.exe',
    data: {
      'process.name': ['mimikatz.exe'],
      '@timestamp': ['2022-05-23T11:03:11.511Z'],
      'process.parent.entity_id': ['o055ylvrqg'],
      'process.Ext.ancestry': ['o055ylvrqg', 'p1dbx787xe'],
      'process.entity_id': ['33k536gv9n'],
    },
    stats: {
      total: 5,
      byCategory: {
        file: 4,
        network: 1,
      },
    },
  },
  {
    id: 'tbxjoicr50',
    parent: 'kemjvigx5w',
    name: 'iexlorer.exe',
    data: {
      'process.name': ['iexlorer.exe'],
      '@timestamp': ['2022-05-23T11:03:15.511Z'],
      'process.parent.entity_id': ['kemjvigx5w'],
      'process.Ext.ancestry': ['kemjvigx5w', 'p1dbx787xe'],
      'process.entity_id': ['tbxjoicr50'],
    },
    stats: {
      total: 5,
      byCategory: {
        authentication: 2,
        driver: 2,
        session: 2,
        file: 1,
      },
    },
  },
  {
    id: '4kdvfoj2u9',
    parent: 'kemjvigx5w',
    name: 'notepad.exe',
    data: {
      'process.name': ['notepad.exe'],
      '@timestamp': ['2022-05-23T11:03:17.511Z'],
      'process.parent.entity_id': ['kemjvigx5w'],
      'process.Ext.ancestry': ['kemjvigx5w', 'p1dbx787xe'],
      'process.entity_id': ['4kdvfoj2u9'],
    },
    stats: {
      total: 0,
      byCategory: {},
    },
  },
  {
    id: 'lfgmzmj99j',
    parent: 'kemjvigx5w',
    name: 'powershell.exe',
    data: {
      'process.name': ['powershell.exe'],
      '@timestamp': ['2022-05-23T11:03:19.511Z'],
      'process.parent.entity_id': ['kemjvigx5w'],
      'process.Ext.ancestry': ['kemjvigx5w', 'p1dbx787xe'],
      'process.entity_id': ['lfgmzmj99j'],
    },
    stats: {
      total: 0,
      byCategory: {},
    },
  },
  {
    id: 'yx3us23cnz',
    parent: 'spk93ihzue',
    name: 'notepad.exe',
    data: {
      'process.name': ['notepad.exe'],
      '@timestamp': ['2022-05-23T11:03:03.511Z'],
      'process.parent.entity_id': ['spk93ihzue'],
      'process.Ext.ancestry': ['72221vhp1s', 'spk93ihzue'],
      'process.entity_id': ['yx3us23cnz'],
    },
    stats: {
      total: 0,
      byCategory: {},
    },
  },
  {
    id: '5n8xwwsm4y',
    parent: 'spk93ihzue',
    name: 'explorer.exe',
    data: {
      'process.name': ['explorer.exe'],
      '@timestamp': ['2022-05-23T11:03:04.511Z'],
      'process.parent.entity_id': ['spk93ihzue'],
      'process.Ext.ancestry': ['72221vhp1s', 'spk93ihzue'],
      'process.entity_id': ['5n8xwwsm4y'],
    },
    stats: {
      total: 5,
      byCategory: {
        authentication: 2,
        registry: 2,
        session: 2,
        driver: 1,
      },
    },
  },
  {
    id: 'yx2sbsktcr',
    parent: 'eefk3v3tg0',
    name: 'explorer.exe',
    data: {
      'process.name': ['explorer.exe'],
      '@timestamp': ['2022-05-23T11:03:06.511Z'],
      'process.parent.entity_id': ['eefk3v3tg0'],
      'process.Ext.ancestry': ['72221vhp1s', 'eefk3v3tg0'],
      'process.entity_id': ['yx2sbsktcr'],
    },
    stats: {
      total: 0,
      byCategory: {},
    },
  },
  {
    id: 'm6681zvabo',
    parent: 'eefk3v3tg0',
    name: 'iexlorer.exe',
    data: {
      'process.name': ['iexlorer.exe'],
      '@timestamp': ['2022-05-23T11:03:07.511Z'],
      'process.parent.entity_id': ['eefk3v3tg0'],
      'process.Ext.ancestry': ['72221vhp1s', 'eefk3v3tg0'],
      'process.entity_id': ['m6681zvabo'],
    },
    stats: {
      total: 5,
      byCategory: {
        authentication: 3,
        session: 3,
        network: 1,
        registry: 1,
      },
    },
  },
  {
    id: '57ega9sp2m',
    parent: 'eefk3v3tg0',
    name: 'explorer.exe',
    data: {
      'process.name': ['explorer.exe'],
      '@timestamp': ['2022-05-23T11:03:08.511Z'],
      'process.parent.entity_id': ['eefk3v3tg0'],
      'process.Ext.ancestry': ['72221vhp1s', 'eefk3v3tg0'],
      'process.entity_id': ['57ega9sp2m'],
    },
    stats: {
      total: 0,
      byCategory: {},
    },
  },
  {
    id: '2q9pvz4liy',
    parent: '33k536gv9n',
    name: 'iexlorer.exe',
    data: {
      'process.name': ['iexlorer.exe'],
      '@timestamp': ['2022-05-23T11:03:12.511Z'],
      'process.parent.entity_id': ['33k536gv9n'],
      'process.Ext.ancestry': ['33k536gv9n', 'o055ylvrqg'],
      'process.entity_id': ['2q9pvz4liy'],
    },
    stats: {
      total: 0,
      byCategory: {},
    },
  },
  {
    id: 'hpzss8vcwd',
    parent: '33k536gv9n',
    name: 'explorer.exe',
    data: {
      'process.name': ['explorer.exe'],
      '@timestamp': ['2022-05-23T11:03:13.511Z'],
      'process.parent.entity_id': ['33k536gv9n'],
      'process.Ext.ancestry': ['33k536gv9n', 'o055ylvrqg'],
      'process.entity_id': ['hpzss8vcwd'],
    },
    stats: {
      total: 0,
      byCategory: {},
    },
  },
  {
    id: 'lar8v50hvc',
    parent: 'tbxjoicr50',
    name: 'notepad.exe',
    data: {
      'process.name': ['notepad.exe'],
      '@timestamp': ['2022-05-23T11:03:16.511Z'],
      'process.parent.entity_id': ['tbxjoicr50'],
      'process.Ext.ancestry': ['kemjvigx5w', 'tbxjoicr50'],
      'process.entity_id': ['lar8v50hvc'],
    },
    stats: {
      total: 0,
      byCategory: {},
    },
  },
  {
    id: '22olnc3pqr',
    parent: '4kdvfoj2u9',
    name: 'iexlorer.exe',
    data: {
      'process.name': ['iexlorer.exe'],
      '@timestamp': ['2022-05-23T11:03:18.511Z'],
      'process.parent.entity_id': ['4kdvfoj2u9'],
      'process.Ext.ancestry': ['4kdvfoj2u9', 'kemjvigx5w'],
      'process.entity_id': ['22olnc3pqr'],
    },
    stats: {
      total: 0,
      byCategory: {},
    },
  },
];

export const stubFetchTimelineEvents = () => {
  return {
    took: 2,
    timed_out: false,
    _shards: {
      total: 2,
      successful: 2,
      skipped: 0,
      failed: 0,
    },
    hits: {
      total: {
        value: 32,
        relation: 'eq',
      },
      max_score: 0,
      hits: [
        {
          _index: '.ds-logs-endpoint.events.process-default-2022.05.23-000001',
          _id: 'f-KV8IABsphBWHn-nT4H',
          _score: 0,
          _source: {
            process: {
              args: ['"C:\\mimikatz.exe"', '--fd0'],
              Ext: {
                ancestry: [],
              },
              group_leader: {
                name: 'fake leader',
                pid: 780,
                entity_id: '3po060bfqd',
              },
              session_leader: {
                name: 'fake session',
                pid: 124,
                entity_id: '3po060bfqd',
              },
              code_signature: {
                subject_name: 'Microsoft',
                status: 'trusted',
              },
              entry_leader: {
                name: 'fake entry',
                pid: 12,
                entity_id: '3po060bfqd',
              },
              name: 'mimikatz.exe',
              pid: 644,
              working_directory: '/home/h351qq3jzg/',
              entity_id: '3po060bfqd',
              executable: 'C:\\mimikatz.exe',
              hash: {
                md5: '848277f3-026f-4e55-8447-51d2e2c3d16a',
              },
            },
            '@timestamp': 1653303774511,
            event: {
              agent_id_status: 'auth_metadata_missing',
              sequence: 0,
              ingested: '2022-05-23T11:02:53Z',
              kind: 'event',
              id: 'bffdfe87-d26a-4314-9c76-06ab1f8638e8',
              category: ['process'],
              type: ['start'],
            },
          },
        },
        {
          _index: '.ds-logs-endpoint.events.process-default-2022.05.23-000001',
          _id: 'gOKV8IABsphBWHn-nT4H',
          _score: 0,
          _source: {
            process: {
              Ext: {
                ancestry: ['3po060bfqd'],
              },
              parent: {
                pid: 644,
                entity_id: '3po060bfqd',
              },
              group_leader: {
                name: 'fake leader',
                pid: 997,
                entity_id: '3po060bfqd',
              },
              pid: 974,
              working_directory: '/home/73xgdrsqsl/',
              entity_id: 'up4f1f87wr',
              executable: 'C:\\notepad.exe',
              args: ['"C:\\notepad.exe"', '--u2n'],
              session_leader: {
                name: 'fake session',
                pid: 753,
                entity_id: '3po060bfqd',
              },
              code_signature: {
                subject_name: 'Microsoft',
                status: 'trusted',
              },
              entry_leader: {
                name: 'fake entry',
                pid: 199,
                entity_id: '3po060bfqd',
              },
              name: 'notepad.exe',
              hash: {
                md5: 'd5d6d125-d2a6-459c-be47-64d226a9fe86',
              },
            },
            '@timestamp': 1653303775511,
            event: {
              agent_id_status: 'auth_metadata_missing',
              sequence: 1,
              ingested: '2022-05-23T11:02:53Z',
              kind: 'event',
              id: '157d0d30-aa65-427b-9ddc-66096328d172',
              category: ['process'],
              type: ['start'],
            },
          },
        },
        {
          _index: '.ds-logs-endpoint.events.process-default-2022.05.23-000001',
          _id: 'i-KV8IABsphBWHn-nT4H',
          _score: 0,
          _source: {
            process: {
              Ext: {
                ancestry: ['up4f1f87wr', '3po060bfqd'],
              },
              parent: {
                pid: 974,
                entity_id: 'up4f1f87wr',
              },
              group_leader: {
                name: 'fake leader',
                pid: 253,
                entity_id: '3po060bfqd',
              },
              pid: 2241,
              working_directory: '/home/x6tczq6ibn/',
              entity_id: 'j0mdzksneq',
              executable: 'C:\\notepad.exe',
              args: ['"C:\\notepad.exe"', '--dl7'],
              session_leader: {
                name: 'fake session',
                pid: 539,
                entity_id: '3po060bfqd',
              },
              code_signature: {
                subject_name: 'Microsoft',
                status: 'trusted',
              },
              entry_leader: {
                name: 'fake entry',
                pid: 820,
                entity_id: '3po060bfqd',
              },
              name: 'notepad.exe',
              hash: {
                md5: '065eb1f0-d255-41d3-a126-701c266a6ef1',
              },
            },
            '@timestamp': 1653303776511,
            event: {
              agent_id_status: 'auth_metadata_missing',
              sequence: 12,
              ingested: '2022-05-23T11:02:53Z',
              kind: 'event',
              id: '2f348502-f7fe-4688-8d13-46c1fbfe5c16',
              category: ['process'],
              type: ['start'],
            },
          },
        },
        {
          _index: '.ds-logs-endpoint.events.process-default-2022.05.23-000001',
          _id: 'jOKV8IABsphBWHn-nT4H',
          _score: 0,
          _source: {
            process: {
              Ext: {
                ancestry: ['up4f1f87wr', '3po060bfqd'],
              },
              parent: {
                pid: 1591,
                entity_id: 'up4f1f87wr',
              },
              group_leader: {
                name: 'fake leader',
                pid: 852,
                entity_id: '3po060bfqd',
              },
              pid: 3696,
              working_directory: '/home/s4c3y8wrzj/',
              entity_id: 'j0mdzksneq',
              executable: 'C:\\notepad.exe',
              args: ['"C:\\notepad.exe"', '--0my'],
              session_leader: {
                name: 'fake session',
                pid: 948,
                entity_id: '3po060bfqd',
              },
              code_signature: {
                subject_name: 'Microsoft',
                status: 'trusted',
              },
              entry_leader: {
                name: 'fake entry',
                pid: 570,
                entity_id: '3po060bfqd',
              },
              name: 'notepad.exe',
              hash: {
                md5: '56c70b52-e25e-46f1-9d1c-407c355daeca',
              },
            },
            '@timestamp': 1654124641511,
            event: {
              agent_id_status: 'auth_metadata_missing',
              sequence: 13,
              ingested: '2022-05-23T11:02:53Z',
              kind: 'event',
              id: 'b87ef54d-283c-4029-a0f4-d0b1a7d3179c',
              category: ['process'],
              type: ['end'],
            },
          },
        },
        {
          _index: '.ds-logs-endpoint.events.process-default-2022.05.23-000001',
          _id: 'jeKV8IABsphBWHn-nT4H',
          _score: 0,
          _source: {
            process: {
              Ext: {
                ancestry: ['j0mdzksneq', 'up4f1f87wr'],
              },
              parent: {
                pid: 2241,
                entity_id: 'j0mdzksneq',
              },
              group_leader: {
                name: 'fake leader',
                pid: 304,
                entity_id: '3po060bfqd',
              },
              pid: 3678,
              working_directory: '/home/943lu62rw5/',
              entity_id: 'p1dbx787xe',
              executable: 'C:\\explorer.exe',
              args: ['"C:\\explorer.exe"', '--4p9'],
              session_leader: {
                name: 'fake session',
                pid: 429,
                entity_id: '3po060bfqd',
              },
              code_signature: {
                subject_name: 'Microsoft',
                status: 'trusted',
              },
              entry_leader: {
                name: 'fake entry',
                pid: 894,
                entity_id: '3po060bfqd',
              },
              name: 'explorer.exe',
              hash: {
                md5: 'd2e5bdc0-cb03-4a16-b89d-3cc47cdc4463',
              },
            },
            '@timestamp': 1653303777511,
            event: {
              agent_id_status: 'auth_metadata_missing',
              sequence: 14,
              ingested: '2022-05-23T11:02:53Z',
              kind: 'event',
              id: 'aaa5cae6-a00c-4081-ae14-b10393e455c1',
              category: ['process'],
              type: ['start'],
            },
          },
        },
        {
          _index: '.ds-logs-endpoint.events.process-default-2022.05.23-000001',
          _id: 'j-KV8IABsphBWHn-nT4H',
          _score: 0,
          _source: {
            process: {
              Ext: {
                ancestry: ['p1dbx787xe', 'j0mdzksneq'],
              },
              parent: {
                pid: 4555,
                entity_id: 'p1dbx787xe',
              },
              group_leader: {
                name: 'fake leader',
                pid: 111,
                entity_id: '3po060bfqd',
              },
              pid: 1618,
              working_directory: '/home/mwler9rdyj/',
              entity_id: '72221vhp1s',
              executable: 'C:\\lsass.exe',
              args: ['"C:\\lsass.exe"', '--448'],
              session_leader: {
                name: 'fake session',
                pid: 259,
                entity_id: '3po060bfqd',
              },
              code_signature: {
                subject_name: 'Microsoft',
                status: 'trusted',
              },
              entry_leader: {
                name: 'fake entry',
                pid: 301,
                entity_id: '3po060bfqd',
              },
              name: 'lsass.exe',
              hash: {
                md5: '9bdc057b-5b79-4a1f-b96d-5027d1089977',
              },
            },
            '@timestamp': 1653303780511,
            event: {
              agent_id_status: 'auth_metadata_missing',
              sequence: 16,
              ingested: '2022-05-23T11:02:53Z',
              kind: 'event',
              id: 'e5915b76-0f6b-461b-945c-d9cf9291fa1d',
              category: ['process'],
              type: ['start'],
            },
          },
        },
        {
          _index: '.ds-logs-endpoint.events.process-default-2022.05.23-000001',
          _id: 'kOKV8IABsphBWHn-nT4H',
          _score: 0,
          _source: {
            process: {
              Ext: {
                ancestry: ['72221vhp1s', 'p1dbx787xe'],
              },
              parent: {
                pid: 4708,
                entity_id: '72221vhp1s',
              },
              group_leader: {
                name: 'fake leader',
                pid: 315,
                entity_id: '3po060bfqd',
              },
              pid: 1156,
              working_directory: '/home/ohyrjwqpx7/',
              entity_id: '9xtipos591',
              executable: 'C:\\iexlorer.exe',
              args: ['"C:\\iexlorer.exe"', '--f1s'],
              session_leader: {
                name: 'fake session',
                pid: 390,
                entity_id: '3po060bfqd',
              },
              code_signature: {
                subject_name: 'Microsoft',
                status: 'trusted',
              },
              entry_leader: {
                name: 'fake entry',
                pid: 268,
                entity_id: '3po060bfqd',
              },
              name: 'iexlorer.exe',
              hash: {
                md5: 'b4211e8c-9e0c-4957-9dac-3e2086f53a36',
              },
            },
            '@timestamp': 1653303781511,
            event: {
              agent_id_status: 'auth_metadata_missing',
              sequence: 17,
              ingested: '2022-05-23T11:02:53Z',
              kind: 'event',
              id: 'aa384768-c473-472e-94bb-d839100e6918',
              category: ['process'],
              type: ['start'],
            },
          },
        },
        {
          _index: '.ds-logs-endpoint.events.process-default-2022.05.23-000001',
          _id: 'keKV8IABsphBWHn-nT4H',
          _score: 0,
          _source: {
            process: {
              Ext: {
                ancestry: ['72221vhp1s', 'p1dbx787xe'],
              },
              parent: {
                pid: 3608,
                entity_id: '72221vhp1s',
              },
              group_leader: {
                name: 'fake leader',
                pid: 477,
                entity_id: '3po060bfqd',
              },
              pid: 2464,
              working_directory: '/home/bpq5j3fgzq/',
              entity_id: 'spk93ihzue',
              executable: 'C:\\explorer.exe',
              args: ['"C:\\explorer.exe"', '--9ii'],
              session_leader: {
                name: 'fake session',
                pid: 247,
                entity_id: '3po060bfqd',
              },
              code_signature: {
                subject_name: 'Microsoft',
                status: 'trusted',
              },
              entry_leader: {
                name: 'fake entry',
                pid: 493,
                entity_id: '3po060bfqd',
              },
              name: 'explorer.exe',
              hash: {
                md5: 'b25a9cc0-bf7f-4880-8b16-7da5f545bf22',
              },
            },
            '@timestamp': 1653303782511,
            event: {
              agent_id_status: 'auth_metadata_missing',
              sequence: 18,
              ingested: '2022-05-23T11:02:53Z',
              kind: 'event',
              id: 'bb7d3758-2274-439d-8fd4-64f7cd3d5411',
              category: ['process'],
              type: ['start'],
            },
          },
        },
        {
          _index: '.ds-logs-endpoint.events.process-default-2022.05.23-000001',
          _id: 'kuKV8IABsphBWHn-nT4H',
          _score: 0,
          _source: {
            process: {
              Ext: {
                ancestry: ['spk93ihzue', '72221vhp1s'],
              },
              parent: {
                pid: 4087,
                entity_id: 'spk93ihzue',
              },
              group_leader: {
                name: 'fake leader',
                pid: 788,
                entity_id: '3po060bfqd',
              },
              pid: 632,
              working_directory: '/home/0qiwrpn3zj/',
              entity_id: 'yx3us23cnz',
              executable: 'C:\\notepad.exe',
              args: ['"C:\\notepad.exe"', '--1et'],
              session_leader: {
                name: 'fake session',
                pid: 374,
                entity_id: '3po060bfqd',
              },
              code_signature: {
                subject_name: 'Microsoft',
                status: 'trusted',
              },
              entry_leader: {
                name: 'fake entry',
                pid: 353,
                entity_id: '3po060bfqd',
              },
              name: 'notepad.exe',
              hash: {
                md5: '134dbb94-ee50-47bb-8b5b-73b9e21670cb',
              },
            },
            '@timestamp': 1653303783511,
            event: {
              agent_id_status: 'auth_metadata_missing',
              sequence: 19,
              ingested: '2022-05-23T11:02:53Z',
              kind: 'event',
              id: 'c4962257-1f6c-4098-b13b-9089ea1d0af5',
              category: ['process'],
              type: ['start'],
            },
          },
        },
        {
          _index: '.ds-logs-endpoint.events.process-default-2022.05.23-000001',
          _id: 'k-KV8IABsphBWHn-nT4H',
          _score: 0,
          _source: {
            process: {
              Ext: {
                ancestry: ['spk93ihzue', '72221vhp1s'],
              },
              parent: {
                pid: 429,
                entity_id: 'spk93ihzue',
              },
              group_leader: {
                name: 'fake leader',
                pid: 675,
                entity_id: '3po060bfqd',
              },
              pid: 2390,
              working_directory: '/home/4vo90awsyg/',
              entity_id: '5n8xwwsm4y',
              executable: 'C:\\explorer.exe',
              args: ['"C:\\explorer.exe"', '--3e2'],
              session_leader: {
                name: 'fake session',
                pid: 543,
                entity_id: '3po060bfqd',
              },
              code_signature: {
                subject_name: 'Microsoft',
                status: 'trusted',
              },
              entry_leader: {
                name: 'fake entry',
                pid: 738,
                entity_id: '3po060bfqd',
              },
              name: 'explorer.exe',
              hash: {
                md5: 'bef94719-099d-4afa-b601-36d0c6c638a0',
              },
            },
            '@timestamp': 1653303784511,
            event: {
              agent_id_status: 'auth_metadata_missing',
              sequence: 20,
              ingested: '2022-05-23T11:02:53Z',
              kind: 'event',
              id: '403f5fa4-4a04-4a5d-a2cf-d325d1bdde06',
              category: ['process'],
              type: ['start'],
            },
          },
        },
        {
          _index: '.ds-logs-endpoint.events.process-default-2022.05.23-000001',
          _id: 'nuKV8IABsphBWHn-nT4I',
          _score: 0,
          _source: {
            process: {
              Ext: {
                ancestry: ['72221vhp1s', 'p1dbx787xe'],
              },
              parent: {
                pid: 2493,
                entity_id: '72221vhp1s',
              },
              group_leader: {
                name: 'fake leader',
                pid: 130,
                entity_id: '3po060bfqd',
              },
              pid: 214,
              working_directory: '/home/ou0t92en75/',
              entity_id: 'eefk3v3tg0',
              executable: 'C:\\iexlorer.exe',
              args: ['"C:\\iexlorer.exe"', '--vqg'],
              session_leader: {
                name: 'fake session',
                pid: 428,
                entity_id: '3po060bfqd',
              },
              code_signature: {
                subject_name: 'Microsoft',
                status: 'trusted',
              },
              entry_leader: {
                name: 'fake entry',
                pid: 564,
                entity_id: '3po060bfqd',
              },
              name: 'iexlorer.exe',
              hash: {
                md5: 'a7382338-84c3-47e5-9f47-a737922b2ffa',
              },
            },
            '@timestamp': 1653303785511,
            event: {
              agent_id_status: 'auth_metadata_missing',
              sequence: 31,
              ingested: '2022-05-23T11:02:53Z',
              kind: 'event',
              id: '183adae5-e6c7-456c-aca4-bb0675b106c9',
              category: ['process'],
              type: ['start'],
            },
          },
        },
        {
          _index: '.ds-logs-endpoint.events.process-default-2022.05.23-000001',
          _id: 'n-KV8IABsphBWHn-nT4I',
          _score: 0,
          _source: {
            process: {
              Ext: {
                ancestry: ['72221vhp1s', 'p1dbx787xe'],
              },
              parent: {
                pid: 797,
                entity_id: '72221vhp1s',
              },
              group_leader: {
                name: 'fake leader',
                pid: 946,
                entity_id: '3po060bfqd',
              },
              pid: 9,
              working_directory: '/home/6bfscwho95/',
              entity_id: 'eefk3v3tg0',
              executable: 'C:\\explorer.exe',
              args: ['"C:\\explorer.exe"', '--ai0'],
              session_leader: {
                name: 'fake session',
                pid: 158,
                entity_id: '3po060bfqd',
              },
              code_signature: {
                subject_name: 'Microsoft',
                status: 'trusted',
              },
              entry_leader: {
                name: 'fake entry',
                pid: 453,
                entity_id: '3po060bfqd',
              },
              name: 'explorer.exe',
              hash: {
                md5: 'ae236075-a0d8-4735-897a-94e2b6db13f5',
              },
            },
            '@timestamp': 1653579812511,
            event: {
              agent_id_status: 'auth_metadata_missing',
              sequence: 32,
              ingested: '2022-05-23T11:02:53Z',
              kind: 'event',
              id: '48d65fd5-9fc2-4250-8d7a-0719f8c38a93',
              category: ['process'],
              type: ['end'],
            },
          },
        },
        {
          _index: '.ds-logs-endpoint.events.process-default-2022.05.23-000001',
          _id: 'oOKV8IABsphBWHn-nT4I',
          _score: 0,
          _source: {
            process: {
              Ext: {
                ancestry: ['eefk3v3tg0', '72221vhp1s'],
              },
              parent: {
                pid: 458,
                entity_id: 'eefk3v3tg0',
              },
              group_leader: {
                name: 'fake leader',
                pid: 728,
                entity_id: '3po060bfqd',
              },
              pid: 4069,
              working_directory: '/home/tqoq4hemri/',
              entity_id: 'yx2sbsktcr',
              executable: 'C:\\explorer.exe',
              args: ['"C:\\explorer.exe"', '--tru'],
              session_leader: {
                name: 'fake session',
                pid: 903,
                entity_id: '3po060bfqd',
              },
              code_signature: {
                subject_name: 'Microsoft',
                status: 'trusted',
              },
              entry_leader: {
                name: 'fake entry',
                pid: 407,
                entity_id: '3po060bfqd',
              },
              name: 'explorer.exe',
              hash: {
                md5: '67057556-8c28-47ef-856a-54d1fee52bab',
              },
            },
            '@timestamp': 1653303786511,
            event: {
              agent_id_status: 'auth_metadata_missing',
              sequence: 33,
              ingested: '2022-05-23T11:02:53Z',
              kind: 'event',
              id: 'de276c4b-42b9-4e68-869c-ae39afc27976',
              category: ['process'],
              type: ['start'],
            },
          },
        },
        {
          _index: '.ds-logs-endpoint.events.process-default-2022.05.23-000001',
          _id: 'oeKV8IABsphBWHn-nT4I',
          _score: 0,
          _source: {
            process: {
              Ext: {
                ancestry: ['eefk3v3tg0', '72221vhp1s'],
              },
              parent: {
                pid: 4334,
                entity_id: 'eefk3v3tg0',
              },
              group_leader: {
                name: 'fake leader',
                pid: 134,
                entity_id: '3po060bfqd',
              },
              pid: 82,
              working_directory: '/home/40f18m4zzo/',
              entity_id: 'm6681zvabo',
              executable: 'C:\\iexlorer.exe',
              args: ['"C:\\iexlorer.exe"', '--kym'],
              session_leader: {
                name: 'fake session',
                pid: 290,
                entity_id: '3po060bfqd',
              },
              code_signature: {
                subject_name: 'Microsoft',
                status: 'trusted',
              },
              entry_leader: {
                name: 'fake entry',
                pid: 141,
                entity_id: '3po060bfqd',
              },
              name: 'iexlorer.exe',
              hash: {
                md5: '51281a5c-7eba-42f9-b563-61f0eac87e33',
              },
            },
            '@timestamp': 1653303787511,
            event: {
              agent_id_status: 'auth_metadata_missing',
              sequence: 34,
              ingested: '2022-05-23T11:02:53Z',
              kind: 'event',
              id: 'd4c6c047-5c70-47bc-9f50-7b143e580caa',
              category: ['process'],
              type: ['start'],
            },
          },
        },
        {
          _index: '.ds-logs-endpoint.events.process-default-2022.05.23-000001',
          _id: 'rOKV8IABsphBWHn-nT4I',
          _score: 0,
          _source: {
            process: {
              Ext: {
                ancestry: ['eefk3v3tg0', '72221vhp1s'],
              },
              parent: {
                pid: 1876,
                entity_id: 'eefk3v3tg0',
              },
              group_leader: {
                name: 'fake leader',
                pid: 43,
                entity_id: '3po060bfqd',
              },
              pid: 1168,
              working_directory: '/home/rdk4jzxof4/',
              entity_id: '57ega9sp2m',
              executable: 'C:\\explorer.exe',
              args: ['"C:\\explorer.exe"', '--ham'],
              session_leader: {
                name: 'fake session',
                pid: 497,
                entity_id: '3po060bfqd',
              },
              code_signature: {
                subject_name: 'Microsoft',
                status: 'trusted',
              },
              entry_leader: {
                name: 'fake entry',
                pid: 280,
                entity_id: '3po060bfqd',
              },
              name: 'explorer.exe',
              hash: {
                md5: '1b12825c-5b27-4172-8a96-c518df53ab26',
              },
            },
            '@timestamp': 1653303788511,
            event: {
              agent_id_status: 'auth_metadata_missing',
              sequence: 45,
              ingested: '2022-05-23T11:02:53Z',
              kind: 'event',
              id: 'eae70e75-e955-436e-94c9-034a485a4f61',
              category: ['process'],
              type: ['start'],
            },
          },
        },
        {
          _index: '.ds-logs-endpoint.events.process-default-2022.05.23-000001',
          _id: 'reKV8IABsphBWHn-nT4I',
          _score: 0,
          _source: {
            process: {
              Ext: {
                ancestry: ['p1dbx787xe', 'j0mdzksneq'],
              },
              parent: {
                pid: 255,
                entity_id: 'p1dbx787xe',
              },
              group_leader: {
                name: 'fake leader',
                pid: 81,
                entity_id: '3po060bfqd',
              },
              pid: 3316,
              working_directory: '/home/5zyydjd6ns/',
              entity_id: 'o055ylvrqg',
              executable: 'C:\\powershell.exe',
              args: ['"C:\\powershell.exe"', '--622'],
              session_leader: {
                name: 'fake session',
                pid: 239,
                entity_id: '3po060bfqd',
              },
              code_signature: {
                subject_name: 'Microsoft',
                status: 'trusted',
              },
              entry_leader: {
                name: 'fake entry',
                pid: 805,
                entity_id: '3po060bfqd',
              },
              name: 'powershell.exe',
              hash: {
                md5: 'cd25ea58-396f-48f7-a1c3-4d3bafd8348c',
              },
            },
            '@timestamp': 1653303789511,
            event: {
              agent_id_status: 'auth_metadata_missing',
              sequence: 46,
              ingested: '2022-05-23T11:02:53Z',
              kind: 'event',
              id: '7b41a46d-5d21-4f40-bd5b-dba8465a4c6c',
              category: ['process'],
              type: ['start'],
            },
          },
        },
        {
          _index: '.ds-logs-endpoint.events.process-default-2022.05.23-000001',
          _id: 'ruKV8IABsphBWHn-nT4I',
          _score: 0,
          _source: {
            process: {
              Ext: {
                ancestry: ['o055ylvrqg', 'p1dbx787xe'],
              },
              parent: {
                pid: 4612,
                entity_id: 'o055ylvrqg',
              },
              group_leader: {
                name: 'fake leader',
                pid: 155,
                entity_id: '3po060bfqd',
              },
              pid: 2147,
              working_directory: '/home/4nsogy8ycy/',
              entity_id: 'z7t7ai4mcl',
              executable: 'C:\\powershell.exe',
              args: ['"C:\\powershell.exe"', '--p7b'],
              session_leader: {
                name: 'fake session',
                pid: 159,
                entity_id: '3po060bfqd',
              },
              code_signature: {
                subject_name: 'Microsoft',
                status: 'trusted',
              },
              entry_leader: {
                name: 'fake entry',
                pid: 887,
                entity_id: '3po060bfqd',
              },
              name: 'powershell.exe',
              hash: {
                md5: '113f90f8-895c-4497-b69e-1ca043011b95',
              },
            },
            '@timestamp': 1653303790511,
            event: {
              agent_id_status: 'auth_metadata_missing',
              sequence: 47,
              ingested: '2022-05-23T11:02:53Z',
              kind: 'event',
              id: 'c0717b62-387a-4802-b164-45918c790902',
              category: ['process'],
              type: ['start'],
            },
          },
        },
        {
          _index: '.ds-logs-endpoint.events.process-default-2022.05.23-000001',
          _id: 'r-KV8IABsphBWHn-nT4I',
          _score: 0,
          _source: {
            process: {
              Ext: {
                ancestry: ['o055ylvrqg', 'p1dbx787xe'],
              },
              parent: {
                pid: 4431,
                entity_id: 'o055ylvrqg',
              },
              group_leader: {
                name: 'fake leader',
                pid: 11,
                entity_id: '3po060bfqd',
              },
              pid: 3288,
              working_directory: '/home/ji0q863pka/',
              entity_id: 'z7t7ai4mcl',
              executable: 'C:\\explorer.exe',
              args: ['"C:\\explorer.exe"', '--1j6'],
              session_leader: {
                name: 'fake session',
                pid: 419,
                entity_id: '3po060bfqd',
              },
              code_signature: {
                subject_name: 'Microsoft',
                status: 'trusted',
              },
              entry_leader: {
                name: 'fake entry',
                pid: 209,
                entity_id: '3po060bfqd',
              },
              name: 'explorer.exe',
              hash: {
                md5: 'f1e77430-6074-4bfb-986a-97725bf589c2',
              },
            },
            '@timestamp': 1653897359511,
            event: {
              agent_id_status: 'auth_metadata_missing',
              sequence: 48,
              ingested: '2022-05-23T11:02:53Z',
              kind: 'event',
              id: 'f48f37fc-a0b0-4c01-b3d8-a9664e46c13a',
              category: ['process'],
              type: ['end'],
            },
          },
        },
        {
          _index: '.ds-logs-endpoint.events.process-default-2022.05.23-000001',
          _id: 'uuKV8IABsphBWHn-nT4I',
          _score: 0,
          _source: {
            process: {
              Ext: {
                ancestry: ['o055ylvrqg', 'p1dbx787xe'],
              },
              parent: {
                pid: 3885,
                entity_id: 'o055ylvrqg',
              },
              group_leader: {
                name: 'fake leader',
                pid: 409,
                entity_id: '3po060bfqd',
              },
              pid: 5,
              working_directory: '/home/5q6hfguqxr/',
              entity_id: '33k536gv9n',
              executable: 'C:\\mimikatz.exe',
              args: ['"C:\\mimikatz.exe"', '--3nf'],
              session_leader: {
                name: 'fake session',
                pid: 821,
                entity_id: '3po060bfqd',
              },
              code_signature: {
                subject_name: 'Microsoft',
                status: 'trusted',
              },
              entry_leader: {
                name: 'fake entry',
                pid: 597,
                entity_id: '3po060bfqd',
              },
              name: 'mimikatz.exe',
              hash: {
                md5: 'a756c0dc-d018-4720-a55d-23080f19afeb',
              },
            },
            '@timestamp': 1653303791511,
            event: {
              agent_id_status: 'auth_metadata_missing',
              sequence: 59,
              ingested: '2022-05-23T11:02:53Z',
              kind: 'event',
              id: '95024994-bbf0-4076-8ee0-8d9349d2e2b5',
              category: ['process'],
              type: ['start'],
            },
          },
        },
        {
          _index: '.ds-logs-endpoint.events.process-default-2022.05.23-000001',
          _id: 'xeKV8IABsphBWHn-nT4I',
          _score: 0,
          _source: {
            process: {
              Ext: {
                ancestry: ['33k536gv9n', 'o055ylvrqg'],
              },
              parent: {
                pid: 794,
                entity_id: '33k536gv9n',
              },
              group_leader: {
                name: 'fake leader',
                pid: 49,
                entity_id: '3po060bfqd',
              },
              pid: 1583,
              working_directory: '/home/pwkog8tum3/',
              entity_id: '2q9pvz4liy',
              executable: 'C:\\iexlorer.exe',
              args: ['"C:\\iexlorer.exe"', '--8jk'],
              session_leader: {
                name: 'fake session',
                pid: 131,
                entity_id: '3po060bfqd',
              },
              code_signature: {
                subject_name: 'Microsoft',
                status: 'trusted',
              },
              entry_leader: {
                name: 'fake entry',
                pid: 707,
                entity_id: '3po060bfqd',
              },
              name: 'iexlorer.exe',
              hash: {
                md5: 'ecac2bc0-69d9-4fc0-9af3-8a3256b73f0c',
              },
            },
            '@timestamp': 1653303792511,
            event: {
              agent_id_status: 'auth_metadata_missing',
              sequence: 70,
              ingested: '2022-05-23T11:02:53Z',
              kind: 'event',
              id: 'c514d95e-aeda-4ac6-8fb0-60e0baec183f',
              category: ['process'],
              type: ['start'],
            },
          },
        },
        {
          _index: '.ds-logs-endpoint.events.process-default-2022.05.23-000001',
          _id: 'xuKV8IABsphBWHn-nT4I',
          _score: 0,
          _source: {
            process: {
              Ext: {
                ancestry: ['33k536gv9n', 'o055ylvrqg'],
              },
              parent: {
                pid: 3084,
                entity_id: '33k536gv9n',
              },
              group_leader: {
                name: 'fake leader',
                pid: 47,
                entity_id: '3po060bfqd',
              },
              pid: 2788,
              working_directory: '/home/tw5d4v2dhd/',
              entity_id: 'hpzss8vcwd',
              executable: 'C:\\explorer.exe',
              args: ['"C:\\explorer.exe"', '--wyx'],
              session_leader: {
                name: 'fake session',
                pid: 583,
                entity_id: '3po060bfqd',
              },
              code_signature: {
                subject_name: 'Microsoft',
                status: 'trusted',
              },
              entry_leader: {
                name: 'fake entry',
                pid: 713,
                entity_id: '3po060bfqd',
              },
              name: 'explorer.exe',
              hash: {
                md5: '2fe80980-3b06-4a51-9cdd-e011a73b7480',
              },
            },
            '@timestamp': 1653303793511,
            event: {
              agent_id_status: 'auth_metadata_missing',
              sequence: 71,
              ingested: '2022-05-23T11:02:53Z',
              kind: 'event',
              id: '4b4e7a1d-4b19-47bc-a98c-660ce632d91f',
              category: ['process'],
              type: ['start'],
            },
          },
        },
        {
          _index: '.ds-logs-endpoint.events.process-default-2022.05.23-000001',
          _id: 'x-KV8IABsphBWHn-nT4I',
          _score: 0,
          _source: {
            process: {
              Ext: {
                ancestry: ['33k536gv9n', 'o055ylvrqg'],
              },
              parent: {
                pid: 2693,
                entity_id: '33k536gv9n',
              },
              group_leader: {
                name: 'fake leader',
                pid: 553,
                entity_id: '3po060bfqd',
              },
              pid: 4777,
              working_directory: '/home/t59qkz7ecu/',
              entity_id: 'hpzss8vcwd',
              executable: 'C:\\mimikatz.exe',
              args: ['"C:\\mimikatz.exe"', '--mol'],
              session_leader: {
                name: 'fake session',
                pid: 255,
                entity_id: '3po060bfqd',
              },
              code_signature: {
                subject_name: 'Microsoft',
                status: 'trusted',
              },
              entry_leader: {
                name: 'fake entry',
                pid: 354,
                entity_id: '3po060bfqd',
              },
              name: 'mimikatz.exe',
              hash: {
                md5: '8fc89958-89e5-43f6-959f-97f9115771d0',
              },
            },
            '@timestamp': 1654235413511,
            event: {
              agent_id_status: 'auth_metadata_missing',
              sequence: 72,
              ingested: '2022-05-23T11:02:53Z',
              kind: 'event',
              id: 'd3fa03e3-201b-4d65-8faa-0008736d92b6',
              category: ['process'],
              type: ['end'],
            },
          },
        },
        {
          _index: '.ds-logs-endpoint.events.process-default-2022.05.23-000001',
          _id: 'yOKV8IABsphBWHn-nT4I',
          _score: 0,
          _source: {
            process: {
              Ext: {
                ancestry: ['p1dbx787xe', 'j0mdzksneq'],
              },
              parent: {
                pid: 2555,
                entity_id: 'p1dbx787xe',
              },
              group_leader: {
                name: 'fake leader',
                pid: 838,
                entity_id: '3po060bfqd',
              },
              pid: 288,
              working_directory: '/home/l6y0ju3us6/',
              entity_id: 'kemjvigx5w',
              executable: 'C:\\notepad.exe',
              args: ['"C:\\notepad.exe"', '--xci'],
              session_leader: {
                name: 'fake session',
                pid: 350,
                entity_id: '3po060bfqd',
              },
              code_signature: {
                subject_name: 'Microsoft',
                status: 'trusted',
              },
              entry_leader: {
                name: 'fake entry',
                pid: 366,
                entity_id: '3po060bfqd',
              },
              name: 'notepad.exe',
              hash: {
                md5: 'db204c43-247a-4a61-8af5-7f332434173e',
              },
            },
            '@timestamp': 1653303794511,
            event: {
              agent_id_status: 'auth_metadata_missing',
              sequence: 73,
              ingested: '2022-05-23T11:02:53Z',
              kind: 'event',
              id: '3b7d327a-a560-4d8a-9b47-749ae83366e8',
              category: ['process'],
              type: ['start'],
            },
          },
        },
        {
          _index: '.ds-logs-endpoint.events.process-default-2022.05.23-000001',
          _id: 'yeKV8IABsphBWHn-nT4I',
          _score: 0,
          _source: {
            process: {
              Ext: {
                ancestry: ['p1dbx787xe', 'j0mdzksneq'],
              },
              parent: {
                pid: 3103,
                entity_id: 'p1dbx787xe',
              },
              group_leader: {
                name: 'fake leader',
                pid: 210,
                entity_id: '3po060bfqd',
              },
              pid: 4492,
              working_directory: '/home/5s499lqduj/',
              entity_id: 'kemjvigx5w',
              executable: 'C:\\mimikatz.exe',
              args: ['"C:\\mimikatz.exe"', '--hxr'],
              session_leader: {
                name: 'fake session',
                pid: 71,
                entity_id: '3po060bfqd',
              },
              code_signature: {
                subject_name: 'Microsoft',
                status: 'trusted',
              },
              entry_leader: {
                name: 'fake entry',
                pid: 505,
                entity_id: '3po060bfqd',
              },
              name: 'mimikatz.exe',
              hash: {
                md5: '2d270895-8718-48c6-acfb-5d6ddfb10bb7',
              },
            },
            '@timestamp': 1653571764511,
            event: {
              agent_id_status: 'auth_metadata_missing',
              sequence: 74,
              ingested: '2022-05-23T11:02:53Z',
              kind: 'event',
              id: 'b363ec64-a5d7-4589-84e6-9055fd39d122',
              category: ['process'],
              type: ['end'],
            },
          },
        },
        {
          _index: '.ds-logs-endpoint.events.process-default-2022.05.23-000001',
          _id: 'yuKV8IABsphBWHn-nT4I',
          _score: 0,
          _source: {
            process: {
              Ext: {
                ancestry: ['kemjvigx5w', 'p1dbx787xe'],
              },
              parent: {
                pid: 3678,
                entity_id: 'kemjvigx5w',
              },
              group_leader: {
                name: 'fake leader',
                pid: 451,
                entity_id: '3po060bfqd',
              },
              pid: 2275,
              working_directory: '/home/capo07rwi3/',
              entity_id: 'tbxjoicr50',
              executable: 'C:\\iexlorer.exe',
              args: ['"C:\\iexlorer.exe"', '--lc1'],
              session_leader: {
                name: 'fake session',
                pid: 891,
                entity_id: '3po060bfqd',
              },
              code_signature: {
                subject_name: 'Microsoft',
                status: 'trusted',
              },
              entry_leader: {
                name: 'fake entry',
                pid: 595,
                entity_id: '3po060bfqd',
              },
              name: 'iexlorer.exe',
              hash: {
                md5: '5dd468cb-85d0-47be-b84a-6bc3dca6767c',
              },
            },
            '@timestamp': 1653303795511,
            event: {
              agent_id_status: 'auth_metadata_missing',
              sequence: 75,
              ingested: '2022-05-23T11:02:53Z',
              kind: 'event',
              id: 'cafd1046-57fe-4ac1-aadf-0810977d50d6',
              category: ['process'],
              type: ['start'],
            },
          },
        },
        {
          _index: '.ds-logs-endpoint.events.process-default-2022.05.23-000001',
          _id: '1eKV8IABsphBWHn-nT4I',
          _score: 0,
          _source: {
            process: {
              Ext: {
                ancestry: ['tbxjoicr50', 'kemjvigx5w'],
              },
              parent: {
                pid: 3523,
                entity_id: 'tbxjoicr50',
              },
              group_leader: {
                name: 'fake leader',
                pid: 989,
                entity_id: '3po060bfqd',
              },
              pid: 507,
              working_directory: '/home/wrlu2t6z99/',
              entity_id: 'lar8v50hvc',
              executable: 'C:\\notepad.exe',
              args: ['"C:\\notepad.exe"', '--ceo'],
              session_leader: {
                name: 'fake session',
                pid: 349,
                entity_id: '3po060bfqd',
              },
              code_signature: {
                subject_name: 'Microsoft',
                status: 'trusted',
              },
              entry_leader: {
                name: 'fake entry',
                pid: 411,
                entity_id: '3po060bfqd',
              },
              name: 'notepad.exe',
              hash: {
                md5: '71ba9887-26ab-467a-900e-28178da95d1b',
              },
            },
            '@timestamp': 1653303796511,
            event: {
              agent_id_status: 'auth_metadata_missing',
              sequence: 86,
              ingested: '2022-05-23T11:02:53Z',
              kind: 'event',
              id: 'a56a3209-3146-4186-880a-51ef223cc5e5',
              category: ['process'],
              type: ['start'],
            },
          },
        },
        {
          _index: '.ds-logs-endpoint.events.process-default-2022.05.23-000001',
          _id: '1uKV8IABsphBWHn-nT4I',
          _score: 0,
          _source: {
            process: {
              Ext: {
                ancestry: ['tbxjoicr50', 'kemjvigx5w'],
              },
              parent: {
                pid: 4126,
                entity_id: 'tbxjoicr50',
              },
              group_leader: {
                name: 'fake leader',
                pid: 389,
                entity_id: '3po060bfqd',
              },
              pid: 1700,
              working_directory: '/home/k5k0zkznd4/',
              entity_id: 'lar8v50hvc',
              executable: 'C:\\notepad.exe',
              args: ['"C:\\notepad.exe"', '--24g'],
              session_leader: {
                name: 'fake session',
                pid: 751,
                entity_id: '3po060bfqd',
              },
              code_signature: {
                subject_name: 'Microsoft',
                status: 'trusted',
              },
              entry_leader: {
                name: 'fake entry',
                pid: 693,
                entity_id: '3po060bfqd',
              },
              name: 'notepad.exe',
              hash: {
                md5: '3f9905cf-4b57-4a14-87d6-cdf24222a164',
              },
            },
            '@timestamp': 1654251443511,
            event: {
              agent_id_status: 'auth_metadata_missing',
              sequence: 87,
              ingested: '2022-05-23T11:02:53Z',
              kind: 'event',
              id: '51d0ba93-78c5-4a60-b760-7b1f1c1a02e8',
              category: ['process'],
              type: ['end'],
            },
          },
        },
        {
          _index: '.ds-logs-endpoint.events.process-default-2022.05.23-000001',
          _id: '1-KV8IABsphBWHn-nT4I',
          _score: 0,
          _source: {
            process: {
              Ext: {
                ancestry: ['kemjvigx5w', 'p1dbx787xe'],
              },
              parent: {
                pid: 4339,
                entity_id: 'kemjvigx5w',
              },
              group_leader: {
                name: 'fake leader',
                pid: 592,
                entity_id: '3po060bfqd',
              },
              pid: 3149,
              working_directory: '/home/gzb0sjtj79/',
              entity_id: '4kdvfoj2u9',
              executable: 'C:\\notepad.exe',
              args: ['"C:\\notepad.exe"', '--wlr'],
              session_leader: {
                name: 'fake session',
                pid: 411,
                entity_id: '3po060bfqd',
              },
              code_signature: {
                subject_name: 'Microsoft',
                status: 'trusted',
              },
              entry_leader: {
                name: 'fake entry',
                pid: 514,
                entity_id: '3po060bfqd',
              },
              name: 'notepad.exe',
              hash: {
                md5: '9531cfdc-9634-4169-97b2-d6fcaedf946f',
              },
            },
            '@timestamp': 1653303797511,
            event: {
              agent_id_status: 'auth_metadata_missing',
              sequence: 88,
              ingested: '2022-05-23T11:02:53Z',
              kind: 'event',
              id: 'a2d38b84-adbe-4e40-9265-109cb0fb9374',
              category: ['process'],
              type: ['start'],
            },
          },
        },
        {
          _index: '.ds-logs-endpoint.events.process-default-2022.05.23-000001',
          _id: '2OKV8IABsphBWHn-nT4I',
          _score: 0,
          _source: {
            process: {
              Ext: {
                ancestry: ['4kdvfoj2u9', 'kemjvigx5w'],
              },
              parent: {
                pid: 4637,
                entity_id: '4kdvfoj2u9',
              },
              group_leader: {
                name: 'fake leader',
                pid: 312,
                entity_id: '3po060bfqd',
              },
              pid: 3741,
              working_directory: '/home/xl5bdg92xa/',
              entity_id: '22olnc3pqr',
              executable: 'C:\\iexlorer.exe',
              args: ['"C:\\iexlorer.exe"', '--7cj'],
              session_leader: {
                name: 'fake session',
                pid: 549,
                entity_id: '3po060bfqd',
              },
              code_signature: {
                subject_name: 'Microsoft',
                status: 'trusted',
              },
              entry_leader: {
                name: 'fake entry',
                pid: 325,
                entity_id: '3po060bfqd',
              },
              name: 'iexlorer.exe',
              hash: {
                md5: 'd8754665-d660-4188-bfb4-22f7837b9dd8',
              },
            },
            '@timestamp': 1653303798511,
            event: {
              agent_id_status: 'auth_metadata_missing',
              sequence: 89,
              ingested: '2022-05-23T11:02:53Z',
              kind: 'event',
              id: '89782b1c-e288-443c-96fb-858447ae2b4f',
              category: ['process'],
              type: ['start'],
            },
          },
        },
        {
          _index: '.ds-logs-endpoint.events.process-default-2022.05.23-000001',
          _id: '2eKV8IABsphBWHn-nT4I',
          _score: 0,
          _source: {
            process: {
              Ext: {
                ancestry: ['4kdvfoj2u9', 'kemjvigx5w'],
              },
              parent: {
                pid: 210,
                entity_id: '4kdvfoj2u9',
              },
              group_leader: {
                name: 'fake leader',
                pid: 173,
                entity_id: '3po060bfqd',
              },
              pid: 1497,
              working_directory: '/home/uhaptao1wl/',
              entity_id: '22olnc3pqr',
              executable: 'C:\\notepad.exe',
              args: ['"C:\\notepad.exe"', '--232'],
              session_leader: {
                name: 'fake session',
                pid: 694,
                entity_id: '3po060bfqd',
              },
              code_signature: {
                subject_name: 'Microsoft',
                status: 'trusted',
              },
              entry_leader: {
                name: 'fake entry',
                pid: 671,
                entity_id: '3po060bfqd',
              },
              name: 'notepad.exe',
              hash: {
                md5: '98d7edc5-42be-4dc5-b1c5-3321c485a1db',
              },
            },
            '@timestamp': 1654059315511,
            event: {
              agent_id_status: 'auth_metadata_missing',
              sequence: 90,
              ingested: '2022-05-23T11:02:53Z',
              kind: 'event',
              id: '47a5bf53-99a9-4982-af65-1fcd3abb1d40',
              category: ['process'],
              type: ['end'],
            },
          },
        },
        {
          _index: '.ds-logs-endpoint.events.process-default-2022.05.23-000001',
          _id: '2uKV8IABsphBWHn-nT4I',
          _score: 0,
          _source: {
            process: {
              Ext: {
                ancestry: ['kemjvigx5w', 'p1dbx787xe'],
              },
              parent: {
                pid: 2107,
                entity_id: 'kemjvigx5w',
              },
              group_leader: {
                name: 'fake leader',
                pid: 261,
                entity_id: '3po060bfqd',
              },
              pid: 3715,
              working_directory: '/home/f5583b60xu/',
              entity_id: 'lfgmzmj99j',
              executable: 'C:\\powershell.exe',
              args: ['"C:\\powershell.exe"', '--10x'],
              session_leader: {
                name: 'fake session',
                pid: 57,
                entity_id: '3po060bfqd',
              },
              code_signature: {
                subject_name: 'Microsoft',
                status: 'trusted',
              },
              entry_leader: {
                name: 'fake entry',
                pid: 430,
                entity_id: '3po060bfqd',
              },
              name: 'powershell.exe',
              hash: {
                md5: '91a99525-0bc3-42d8-89f7-1fe5cecb8334',
              },
            },
            '@timestamp': 1653303799511,
            event: {
              agent_id_status: 'auth_metadata_missing',
              sequence: 91,
              ingested: '2022-05-23T11:02:53Z',
              kind: 'event',
              id: 'be3621bb-efc9-4eee-b8de-6d07bace543c',
              category: ['process'],
              type: ['start'],
            },
          },
        },
        {
          _index: '.ds-logs-endpoint.events.process-default-2022.05.23-000001',
          _id: '2-KV8IABsphBWHn-nT4I',
          _score: 0,
          _source: {
            process: {
              Ext: {
                ancestry: ['kemjvigx5w', 'p1dbx787xe'],
              },
              parent: {
                pid: 3754,
                entity_id: 'kemjvigx5w',
              },
              group_leader: {
                name: 'fake leader',
                pid: 22,
                entity_id: '3po060bfqd',
              },
              pid: 4895,
              working_directory: '/home/de1ijqnt0h/',
              entity_id: 'lfgmzmj99j',
              executable: 'C:\\lsass.exe',
              args: ['"C:\\lsass.exe"', '--4mb'],
              session_leader: {
                name: 'fake session',
                pid: 808,
                entity_id: '3po060bfqd',
              },
              code_signature: {
                subject_name: 'Microsoft',
                status: 'trusted',
              },
              entry_leader: {
                name: 'fake entry',
                pid: 982,
                entity_id: '3po060bfqd',
              },
              name: 'lsass.exe',
              hash: {
                md5: 'eb3ba411-4b8f-402a-bc70-5758b21ad32c',
              },
            },
            '@timestamp': 1654060564511,
            event: {
              agent_id_status: 'auth_metadata_missing',
              sequence: 92,
              ingested: '2022-05-23T11:02:53Z',
              kind: 'event',
              id: '07dff76f-fb51-42ee-a0af-0f5e49105f8c',
              category: ['process'],
              type: ['end'],
            },
          },
        },
      ],
    },
  };
};
