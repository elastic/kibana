/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
export const stackedByBooleanField = {
  took: 1,
  timed_out: false,
  _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
  hits: {
    total: {
      value: 3,
      relation: 'eq',
    },
    hits: [],
  },
  timeout: false,
  aggregations: {
    alertsByGrouping: {
      doc_count_error_upper_bound: 0,
      sum_other_doc_count: 0,
      buckets: [
        {
          key: 1,
          key_as_string: 'true',
          doc_count: 2683,
          alerts: {
            buckets: [
              { key_as_string: '2022-05-10T15:34:48.075Z', key: 1652196888075, doc_count: 0 },
              { key_as_string: '2022-05-10T16:19:48.074Z', key: 1652199588074, doc_count: 0 },
              { key_as_string: '2022-05-10T17:04:48.073Z', key: 1652202288073, doc_count: 0 },
            ],
          },
        },
      ],
    },
  },
};

export const result = [
  { x: 1652196888075, y: 0, g: 'true' },
  { x: 1652199588074, y: 0, g: 'true' },
  { x: 1652202288073, y: 0, g: 'true' },
];

export const stackedByTextField = {
  took: 1,
  timeout: false,
  _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
  hits: {
    total: {
      value: 3,
      relation: 'eq',
    },
    hits: [],
  },
  aggregations: {
    alertsByGrouping: {
      doc_count_error_upper_bound: 0,
      sum_other_doc_count: 0,
      buckets: [
        {
          key: 'MacBook-Pro.local',
          doc_count: 2706,
          alerts: {
            buckets: [
              { key_as_string: '2022-05-10T15:34:48.075Z', key: 1652196888075, doc_count: 0 },
              { key_as_string: '2022-05-10T16:19:48.074Z', key: 1652199588074, doc_count: 0 },
              { key_as_string: '2022-05-10T17:04:48.073Z', key: 1652202288073, doc_count: 0 },
            ],
          },
        },
      ],
    },
  },
};

export const textResult = [
  { x: 1652196888075, y: 0, g: 'MacBook-Pro.local' },
  { x: 1652199588074, y: 0, g: 'MacBook-Pro.local' },
  { x: 1652202288073, y: 0, g: 'MacBook-Pro.local' },
];

export const mockAlertSearchResponse = {
  took: 1,
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
        _id: 'cb3bcb63c619cd7f3349d77568cc0bf0406210dce95374b04b9bf1e98b68dcdc',
        _score: 0,
        _source: {
          'kibana.version': '8.4.0',
          'kibana.alert.rule.category': 'Custom Query Rule',
          'kibana.alert.rule.consumer': 'siem',
          'kibana.alert.rule.execution.uuid': '5240f735-0205-4af4-8e6d-dec17d0f084e',
          'kibana.alert.rule.name': 'matches everything',
          'kibana.alert.rule.producer': 'siem',
          'kibana.alert.rule.rule_type_id': 'siem.queryRule',
          'kibana.alert.rule.uuid': '6a6ecac0-fe4f-11ec-8ccd-258a52cbda02',
          'kibana.space_ids': ['default'],
          'kibana.alert.rule.tags': ['test'],
          '@timestamp': '2022-07-08T23:58:11.500Z',
          agent: {
            id: '4a6c871a-b23e-4e83-9098-5e14e85c3f7b',
            type: 'endpoint',
            version: '7.6.11',
          },
          process: {
            Ext: {
              ancestry: ['snmviyj5md', '2g4w55131x'],
              code_signature: [
                {
                  trusted: false,
                  subject_name: 'bad signer',
                },
              ],
              user: 'SYSTEM',
              token: {
                integrity_level: 16384,
                privileges: [
                  {
                    name: 'SeAssignPrimaryTokenPrivilege',
                    description: 'Replace a process level token',
                    enabled: false,
                  },
                ],
                integrity_level_name: 'system',
                domain: 'NT AUTHORITY',
                type: 'tokenPrimary',
                user: 'SYSTEM',
                sid: 'S-1-5-18',
              },
            },
            parent: {
              pid: 1,
              entity_id: 'snmviyj5md',
            },
            group_leader: {
              name: 'fake leader',
              pid: 4,
              entity_id: 'xq1spmmi2w',
            },
            session_leader: {
              name: 'fake session',
              pid: 26,
              entity_id: 'xq1spmmi2w',
            },
            entry_leader: {
              name: 'fake entry',
              pid: 558,
              entity_id: 'xq1spmmi2w',
            },
            name: 'malware writer',
            start: 1657324615198,
            pid: 2,
            entity_id: 'v6w0s12zn1',
            executable: 'C:/malware.exe',
            hash: {
              sha1: 'fake sha1',
              sha256: 'fake sha256',
              md5: 'fake md5',
            },
            uptime: 0,
          },
          file: {
            owner: 'SYSTEM',
            Ext: {
              temp_file_path: 'C:/temp/fake_malware.exe',
              code_signature: [
                {
                  trusted: false,
                  subject_name: 'bad signer',
                },
              ],
              quarantine_message: 'fake quarantine message',
              quarantine_result: true,
              malware_classification: {
                identifier: 'endpointpe',
                score: 1,
                threshold: 0.66,
                version: '3.0.33',
              },
            },
            path: 'C:/fake_malware.exe',
            size: 3456,
            created: 1657324615198,
            name: 'fake_malware.exe',
            accessed: 1657324615198,
            mtime: 1657324615198,
            hash: {
              sha1: 'fake file sha1',
              sha256: 'fake file sha256',
              md5: 'fake file md5',
            },
          },
          Endpoint: {
            capabilities: [],
            configuration: {
              isolation: true,
            },
            state: {
              isolation: true,
            },
            status: 'enrolled',
            policy: {
              applied: {
                name: 'With Eventing',
                id: 'C2A9093E-E289-4C0A-AA44-8C32A414FA7A',
                endpoint_policy_version: 3,
                version: 5,
                status: 'failure',
              },
            },
          },
          ecs: {
            version: '1.4.0',
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
          data_stream: {
            namespace: 'default',
            type: 'logs',
            dataset: 'endpoint.alerts',
          },
          elastic: {
            agent: {
              id: '4a6c871a-b23e-4e83-9098-5e14e85c3f7b',
            },
          },
          host: {
            hostname: 'Host-xh6qyoiujf',
            os: {
              Ext: {
                variant: 'Windows Server',
              },
              name: 'Windows',
              family: 'windows',
              version: '6.2',
              platform: 'Windows',
              full: 'Windows Server 2012',
            },
            ip: ['10.74.191.143'],
            name: 'Host-xh6qyoiujf',
            id: 'b51c2aad-8371-44e5-8dab-cb92a8a32414',
            mac: ['86-b5-5e-e7-99-2d'],
            architecture: 'rdf4znaej1',
          },
          'event.agent_id_status': 'auth_metadata_missing',
          'event.sequence': 63,
          'event.ingested': '2022-07-08T21:15:43Z',
          'event.code': 'malicious_file',
          'event.kind': 'signal',
          'event.module': 'endpoint',
          'event.action': 'deletion',
          'event.id': 'c6760bef-1c62-4730-848a-1b2d5f8938f9',
          'event.category': 'malware',
          'event.type': 'creation',
          'event.dataset': 'endpoint',
          'kibana.alert.original_time': '2022-07-08T23:56:55.198Z',
          'kibana.alert.ancestors': [
            {
              id: 'N2ir34EB_eEmuUQvINry',
              type: 'event',
              index: '.ds-logs-endpoint.alerts-default-2022.07.07-000001',
              depth: 0,
            },
          ],
          'kibana.alert.status': 'active',
          'kibana.alert.workflow_status': 'open',
          'kibana.alert.depth': 1,
          'kibana.alert.reason':
            'malware event with process malware writer, file fake_malware.exe, on Host-xh6qyoiujf created low alert matches everything.',
          'kibana.alert.severity': 'low',
          'kibana.alert.risk_score': 21,
          'kibana.alert.rule.parameters': {
            description: 'matches almost everything',
            risk_score: 21,
            severity: 'low',
            license: '',
            meta: {
              from: '1m',
              kibana_siem_app_url: 'http://localhost:5601/app/security',
            },
            author: [],
            false_positives: [],
            from: 'now-360s',
            rule_id: 'f544e86c-4d83-496f-9e5b-c60965b1eb83',
            max_signals: 100,
            risk_score_mapping: [],
            severity_mapping: [],
            threat: [],
            to: 'now',
            references: [],
            version: 1,
            exceptions_list: [],
            immutable: false,
            related_integrations: [],
            required_fields: [],
            setup: '',
            type: 'query',
            language: 'kuery',
            index: [
              'apm-*-transaction*',
              'traces-apm*',
              'auditbeat-*',
              'endgame-*',
              'filebeat-*',
              'logs-*',
              'packetbeat-*',
              'winlogbeat-*',
            ],
            query: '_id: *',
            filters: [],
          },
          'kibana.alert.rule.actions': [],
          'kibana.alert.rule.author': [],
          'kibana.alert.rule.created_at': '2022-07-07T23:49:18.761Z',
          'kibana.alert.rule.created_by': 'elastic',
          'kibana.alert.rule.description': 'matches almost everything',
          'kibana.alert.rule.enabled': true,
          'kibana.alert.rule.exceptions_list': [],
          'kibana.alert.rule.false_positives': [],
          'kibana.alert.rule.from': 'now-360s',
          'kibana.alert.rule.immutable': false,
          'kibana.alert.rule.interval': '5m',
          'kibana.alert.rule.indices': [
            'apm-*-transaction*',
            'traces-apm*',
            'auditbeat-*',
            'endgame-*',
            'filebeat-*',
            'logs-*',
            'packetbeat-*',
            'winlogbeat-*',
          ],
          'kibana.alert.rule.license': '',
          'kibana.alert.rule.max_signals': 100,
          'kibana.alert.rule.references': [],
          'kibana.alert.rule.risk_score_mapping': [],
          'kibana.alert.rule.rule_id': 'f544e86c-4d83-496f-9e5b-c60965b1eb83',
          'kibana.alert.rule.severity_mapping': [],
          'kibana.alert.rule.threat': [],
          'kibana.alert.rule.to': 'now',
          'kibana.alert.rule.type': 'query',
          'kibana.alert.rule.updated_at': '2022-07-07T23:50:01.437Z',
          'kibana.alert.rule.updated_by': 'elastic',
          'kibana.alert.rule.version': 1,
          'kibana.alert.rule.meta.from': '1m',
          'kibana.alert.rule.meta.kibana_siem_app_url': 'http://localhost:5601/app/security',
          'kibana.alert.rule.risk_score': 21,
          'kibana.alert.rule.severity': 'low',
          'kibana.alert.original_event.agent_id_status': 'auth_metadata_missing',
          'kibana.alert.original_event.sequence': 63,
          'kibana.alert.original_event.ingested': '2022-07-08T21:15:43Z',
          'kibana.alert.original_event.code': 'malicious_file',
          'kibana.alert.original_event.kind': 'alert',
          'kibana.alert.original_event.module': 'endpoint',
          'kibana.alert.original_event.action': 'deletion',
          'kibana.alert.original_event.id': 'c6760bef-1c62-4730-848a-1b2d5f8938f9',
          'kibana.alert.original_event.category': 'malware',
          'kibana.alert.original_event.type': 'creation',
          'kibana.alert.original_event.dataset': 'endpoint',
          'kibana.alert.uuid': 'cb3bcb63c619cd7f3349d77568cc0bf0406210dce95374b04b9bf1e98b68dcdc',
        },
      },
    ],
  },
  aggregations: {
    alertsByGrouping: {
      doc_count_error_upper_bound: 0,
      sum_other_doc_count: 0,
      buckets: [
        {
          key: 'matches everything',
          doc_count: 2,
          alerts: {
            buckets: [
              {
                key_as_string: '2022-07-08T05:49:46.200Z',
                key: 1657259386200,
                doc_count: 0,
              },
              {
                key_as_string: '2022-07-08T06:34:46.199Z',
                key: 1657262086199,
                doc_count: 0,
              },
            ],
          },
        },
      ],
    },
  },
};
