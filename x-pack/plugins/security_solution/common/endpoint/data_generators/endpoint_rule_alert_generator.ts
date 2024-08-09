/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { kibanaPackageJson } from '@kbn/repo-info';
import { mergeWith } from 'lodash';
import type { DeepPartial } from 'utility-types';
import { BaseDataGenerator } from './base_data_generator';
import { EndpointMetadataGenerator } from './endpoint_metadata_generator';
import type { HostMetadata } from '../types';
import { ELASTIC_SECURITY_RULE_ID } from '../../detection_engine/constants';

const mergeAndReplaceArrays = <T, S>(destinationObj: T, srcObj: S): T => {
  const customizer = (objValue: T[keyof T], srcValue: S[keyof S]) => {
    if (Array.isArray(objValue)) {
      return srcValue;
    }
  };

  return mergeWith(destinationObj, srcObj, customizer);
};

type EndpointRuleAlert = Pick<
  HostMetadata,
  'Endpoint' | 'agent' | 'elastic' | 'host' | 'data_stream'
> & {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
};

export class EndpointRuleAlertGenerator extends BaseDataGenerator {
  /** Generates an Endpoint Rule Alert document */
  generate(overrides: DeepPartial<EndpointRuleAlert> = {}): EndpointRuleAlert {
    const endpointMetadataGenerator = new EndpointMetadataGenerator();
    const endpointMetadata = endpointMetadataGenerator.generate({
      agent: { version: overrides?.agent?.version ?? kibanaPackageJson.version },
      host: { hostname: overrides?.host?.hostname },
      Endpoint: { state: { isolation: overrides?.Endpoint?.state?.isolation } },
    });
    const now = overrides['@timestamp'] ?? new Date().toISOString();
    const endpointAgentId = overrides?.agent?.id ?? this.seededUUIDv4();

    return mergeAndReplaceArrays(
      {
        '@timestamp': now,
        Endpoint: endpointMetadata.Endpoint,
        agent: {
          id: endpointAgentId,
          type: 'endpoint',
          version: endpointMetadata.agent.version,
        },
        elastic: endpointMetadata.elastic,
        host: endpointMetadata.host,
        data_stream: {
          dataset: 'endpoint.alerts',
          namespace: 'default',
          type: 'logs',
        },
        ecs: {
          version: '1.4.0',
        },
        file: {
          Ext: {
            code_signature: [
              {
                subject_name: 'bad signer',
                trusted: false,
              },
            ],
            malware_classification: {
              identifier: 'endpointpe',
              score: 1,
              threshold: 0.66,
              version: '3.0.33',
            },
            quarantine_message: 'fake quarantine message',
            quarantine_result: true,
            temp_file_path: 'C:/temp/fake_malware.exe',
          },
          accessed: 1666818167432,
          created: 1666818167432,
          hash: {
            md5: 'fake file md5',
            sha1: 'fake file sha1',
            sha256: 'fake file sha256',
          },
          mtime: 1666818167432,
          name: 'fake_malware.exe',
          owner: 'SYSTEM',
          path: 'C:/fake_malware.exe',
          size: 3456,
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
            code_signature: {
              subject_name: 'Cybereason Inc',
              trusted: true,
            },
            hash: {
              md5: '1f2d082566b0fc5f2c238a5180db7451',
              sha1: 'ca85243c0af6a6471bdaa560685c51eefd6dbc0d',
              sha256: '8ad40c90a611d36eb8f9eb24fa04f7dbca713db383ff55a03aa0f382e92061a2',
            },
            path: 'C:\\Program Files\\Cybereason ActiveProbe\\AmSvc.exe',
            pe: {
              architecture: 'x64',
            },
          },
        ],
        process: {
          Ext: {
            ancestry: ['epyg8z2d21', '26qhqfy8a1'],
            code_signature: [
              {
                subject_name: 'bad signer',
                trusted: false,
              },
            ],
            token: {
              domain: 'NT AUTHORITY',
              integrity_level: 16384,
              integrity_level_name: 'system',
              privileges: [
                {
                  description: 'Replace a process level token',
                  enabled: false,
                  name: 'SeAssignPrimaryTokenPrivilege',
                },
              ],
              sid: 'S-1-5-18',
              type: 'tokenPrimary',
              user: 'SYSTEM',
            },
            user: 'SYSTEM',
          },
          entity_id: '0gwuy9lpud',
          entry_leader: {
            entity_id: '8kfl83q6vl',
            name: 'fake entry',
            pid: 945,
          },
          executable: 'C:/malware.exe',
          group_leader: {
            entity_id: '8kfl83q6vl',
            name: 'fake leader',
            pid: 120,
          },
          hash: {
            md5: 'fake md5',
            sha1: 'fake sha1',
            sha256: 'fake sha256',
          },
          name: 'malware writer',
          parent: {
            entity_id: 'epyg8z2d21',
            pid: 1,
          },
          pid: 2,
          session_leader: {
            entity_id: '8kfl83q6vl',
            name: 'fake session',
            pid: 279,
          },
          start: 1666818167432,
          uptime: 0,
        },
        'event.action': 'creation',
        'event.agent_id_status': 'auth_metadata_missing',
        'event.category': 'malware',
        'event.code': 'malicious_file',
        'event.dataset': 'endpoint',
        'event.id': this.seededUUIDv4(),
        'event.ingested': now,
        'event.kind': 'signal',
        'event.module': 'endpoint',
        'event.sequence': 5,
        'event.type': 'creation',
        'kibana.alert.ancestors': [
          {
            depth: 0,
            id: 'QBUaFoQBGSAAfHJkxoRQ',
            index: '.ds-logs-endpoint.alerts-default-2022.10.26-000001',
            type: 'event',
          },
        ],
        'kibana.alert.depth': 1,
        'kibana.alert.original_event.action': 'creation',
        'kibana.alert.original_event.agent_id_status': 'auth_metadata_missing',
        'kibana.alert.original_event.category': 'malware',
        'kibana.alert.original_event.code': 'malicious_file',
        'kibana.alert.original_event.dataset': 'endpoint',
        'kibana.alert.original_event.id': this.seededUUIDv4(),
        'kibana.alert.original_event.ingested': now,
        'kibana.alert.original_event.kind': 'alert',
        'kibana.alert.original_event.module': 'endpoint',
        'kibana.alert.original_event.sequence': 5,
        'kibana.alert.original_event.type': 'creation',
        'kibana.alert.original_time': this.randomPastDate(),
        'kibana.alert.reason':
          'malware event with process malware writer, file fake_malware.exe, on Host-4xu9tiwmfp created medium alert Endpoint Security.',
        'kibana.alert.risk_score': 47,
        'kibana.alert.rule.actions': [],
        'kibana.alert.rule.author': ['Elastic'],
        'kibana.alert.rule.category': 'Custom Query Rule',
        'kibana.alert.rule.consumer': 'siem',
        'kibana.alert.rule.created_at': '2022-10-26T21:02:00.237Z',
        'kibana.alert.rule.created_by': 'some_user',
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
        'kibana.alert.rule.execution.uuid': this.seededUUIDv4(),
        'kibana.alert.rule.false_positives': [],
        'kibana.alert.rule.from': 'now-10m',
        'kibana.alert.rule.immutable': true,
        'kibana.alert.rule.indices': ['logs-endpoint.alerts-*'],
        'kibana.alert.rule.interval': '5m',
        'kibana.alert.rule.license': 'Elastic License v2',
        'kibana.alert.rule.max_signals': 10000,
        'kibana.alert.rule.name': 'Endpoint Security',
        'kibana.alert.rule.parameters': {
          author: ['Elastic'],
          description:
            'Generates a detection alert each time an Elastic Endpoint Security alert is received. Enabling this rule allows you to immediately begin investigating your Endpoint alerts.',
          enabled: true,
          exceptions_list: [
            {
              id: 'endpoint_list',
              list_id: 'endpoint_list',
              namespace_type: 'agnostic',
              type: 'endpoint',
            },
          ],
          from: 'now-10m',
          index: ['logs-endpoint.alerts-*'],
          language: 'kuery',
          license: 'Elastic License v2',
          max_signals: 10000,
          name: 'Endpoint Security',
          query: 'event.kind:alert and event.module:(endpoint and not endgame)\n',
          required_fields: [
            {
              ecs: true,
              name: 'event.kind',
              type: 'keyword',
            },
            {
              ecs: true,
              name: 'event.module',
              type: 'keyword',
            },
          ],
          risk_score: 47,
          risk_score_mapping: [
            {
              field: 'event.risk_score',
              operator: 'equals',
              value: '',
            },
          ],
          response_actions: [
            {
              action_type_id: 'endpoint',
              params: {
                command: 'isolate',
                comment: 'test',
              },
            },
            {
              params: {
                command: 'suspend-process',
                comment: 'Suspend host',
                config: {
                  field: 'entity_id',
                  overwrite: false,
                },
              },
              action_type_id: '.endpoint',
            },
            {
              params: {
                command: 'kill-process',
                comment: 'Kill host',
                config: {
                  field: '',
                  overwrite: true,
                },
              },
              action_type_id: '.endpoint',
            },
          ],
          rule_id: ELASTIC_SECURITY_RULE_ID,
          rule_name_override: 'message',
          severity: 'medium',
          severity_mapping: [
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
          tags: ['Elastic', 'Endpoint Security'],
          timestamp_override: 'event.ingested',
          type: 'query',
          version: 100,
        },
        'kibana.alert.rule.producer': 'siem',
        'kibana.alert.rule.references': [],
        'kibana.alert.rule.risk_score': 47,
        'kibana.alert.rule.risk_score_mapping': [
          {
            field: 'event.risk_score',
            operator: 'equals',
            value: '',
          },
        ],
        'kibana.alert.rule.rule_id': ELASTIC_SECURITY_RULE_ID,
        'kibana.alert.rule.rule_name_override': 'message',
        'kibana.alert.rule.rule_type_id': 'siem.queryRule',
        'kibana.alert.rule.severity': 'medium',
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
        'kibana.alert.rule.tags': ['Elastic', 'Endpoint Security'],
        'kibana.alert.rule.threat': [],
        'kibana.alert.rule.timestamp_override': 'event.ingested',
        'kibana.alert.rule.to': 'now',
        'kibana.alert.rule.type': 'query',
        'kibana.alert.rule.updated_at': '2022-10-26T21:02:00.237Z',
        'kibana.alert.rule.updated_by': 'some_user',
        'kibana.alert.rule.uuid': '6eae8572-5571-11ed-a602-953b659b2e32',
        'kibana.alert.rule.version': 100,
        'kibana.alert.severity': 'medium',
        'kibana.alert.status': 'active',
        'kibana.alert.uuid': 'e25f166b83234cbcfc41600a0191ee6a0efec0f959c6899a325d8026711e6c02',
        'kibana.alert.workflow_status': 'open',
        'kibana.space_ids': ['default'],
        'kibana.version': kibanaPackageJson.version,
      },
      overrides
    );
  }
}
