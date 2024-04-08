/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mergeWith } from 'lodash';
import type { DeepPartial } from 'utility-types';
import { BaseDataGenerator } from './base_data_generator';
import { expandDottedObject } from '../../utils/expand_dotted';

const mergeAndReplaceArrays = <T, S>(destinationObj: T, srcObj: S): T => {
  const customizer = (objValue: T[keyof T], srcValue: S[keyof S]) => {
    if (Array.isArray(objValue)) {
      return srcValue;
    }
  };

  return mergeWith(destinationObj, srcObj, customizer);
};

interface CrowdstrikeRuleAlert {
  // TODO TC: ADD TYPES
  // CrowdstrikeEventType & {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
}

export class CrowdstrikeRuleAlertGenerator extends BaseDataGenerator {
  /** Generates an Endpoint Rule Alert document */
  generate(overrides: DeepPartial<CrowdstrikeRuleAlert> = {}): CrowdstrikeRuleAlert {
    const now = overrides['@timestamp'] ?? new Date().toISOString();

    const alert = expandDottedObject(
      {
        'kibana.alert.severity': ['low'],
        'crowdstrike.event.Flags.Log': [true],
        'kibana.alert.rule.updated_by': ['elastic'],
        'elastic_agent.version': ['8.12.0'],
        'crowdstrike.event.RuleFamilyID': ['fec73e96a1bf4481be582c3f89b234fa'],
        'kibana.alert.reason.text': ['event created low alert cs123.'],
        'observer.vendor': ['crowdstrike'],
        'kibana.alert.ancestors.depth': [0],
        'kibana.alert.risk_score': [21],
        'agent.name': ['jammy-b99d'],
        'event.agent_id_status': ['verified'],
        'crowdstrike.event.Ipv': ['ipv4'],
        'crowdstrike.event.Flags.Audit': [false],
        'kibana.alert.original_event.module': ['crowdstrike'],
        'kibana.alert.rule.interval': ['5m'],
        'input.type': ['log'],
        'kibana.alert.rule.type': ['query'],
        'crowdstrike.event.RemoteAddress': ['10.200.16.148'],
        tags: [
          'forwarded',
          'crowdstrike-fdr',
          '_geoip_database_unavailable_GeoLite2-City.mmdb',
          '_geoip_database_unavailable_GeoLite2-City.mmdb',
          '_geoip_database_unavailable_GeoLite2-City.mmdb',
          '_geoip_database_unavailable_GeoLite2-ASN.mmdb',
          '_geoip_database_unavailable_GeoLite2-ASN.mmdb',
        ],
        'kibana.alert.start': ['2024-03-19T12:59:04.151Z'],
        'kibana.alert.rule.immutable': ['false'],
        'agent.id': ['37620d99-ba60-4e4a-9d90-634d16e84da7'],
        'kibana.alert.rule.enabled': ['true'],
        'kibana.alert.rule.version': ['1'],
        'crowdstrike.event.Platform': ['windows'],
        'crowdstrike.event.LocalPort': ['445'],
        'kibana.alert.ancestors.type': ['event'],
        'crowdstrike.event.DeviceId': ['ae86ad7402404048ac9b8d94db8f7ba2'],
        'crowdstrike.event.Protocol': ['6'],
        'crowdstrike.event.Timestamp': ['2023-11-02T20:55:43Z'],
        'crowdstrike.event.MatchCountSinceLastReport': [1],
        'url.scheme': ['http'],
        'agent.type': ['filebeat'],
        'crowdstrike.event.Flags.Monitor': [true],
        'elastic_agent.snapshot': [false],
        'kibana.alert.rule.max_signals': [100],
        'crowdstrike.event.ConnectionDirection': ['1'],
        'elastic_agent.id': ['37620d99-ba60-4e4a-9d90-634d16e84da7'],
        'kibana.alert.rule.risk_score': [21],
        'kibana.alert.rule.consumer': ['siem'],
        'kibana.alert.rule.indices': [
          'apm-*-transaction*',
          'auditbeat-*',
          'endgame-*',
          'filebeat-*',
          'logs-*',
          'packetbeat-*',
          'traces-apm*',
          'winlogbeat-*',
          '-*elastic-cloud-logs-*',
        ],
        'kibana.alert.rule.category': ['Custom Query Rule'],
        'event.ingested': ['2024-03-19T12:58:40.000Z'],
        '@timestamp': now,
        'kibana.alert.rule.severity': ['low'],
        'crowdstrike.event.HostName': ['ZAUITED119X1L2'],
        'crowdstrike.event.PolicyID': ['3ec266b28bef471f9fd990e4f39ac829'],
        'crowdstrike.event.CustomerId': ['774694c2ef8c43fdb64ec3056ddfb96d'],
        'kibana.alert.original_event.agent_id_status': ['verified'],
        'log.file.path': ['/var/log/falcon_data_replicator.log'],
        'data_stream.dataset': ['crowdstrike.fdr'],
        'agent.ephemeral_id': ['3dd1629e-7492-4ceb-bde4-245ebdd318b2'],
        'kibana.alert.rule.execution.uuid': ['c3d57c3a-cd6e-4198-ad42-0fdb4db5a18b'],
        'kibana.alert.uuid': ['a713560fcba36c6f0ddc160a057bbe577ef11228cc2770bafdcb9f4babdd382a'],
        'kibana.alert.rule.meta.kibana_siem_app_url': ['http://localhost:5601/app/security'],
        'kibana.version': ['8.14.0'],
        'kibana.alert.rule.rule_id': ['be1730fe-2db7-4fa4-8113-cebd9c71777d'],
        'crowdstrike.event.PolicyName': ['PROD-FW-Workstations-Office-20201001'],
        'kibana.alert.ancestors.id': ['yXiJ86jEl8RJChwM+gNeQBT7PLs='],
        'crowdstrike.metadata.offset': [8697397],
        'kibana.alert.rule.description': ['123'],
        'kibana.alert.rule.producer': ['siem'],
        'kibana.alert.rule.to': ['now'],
        'crowdstrike.metadata.eventType': ['FirewallMatchEvent'],
        'kibana.alert.rule.created_by': ['elastic'],
        'crowdstrike.metadata.eventCreationTime': [1698958545000],
        'kibana.alert.original_event.ingested': ['2024-03-19T12:58:40.000Z'],
        'crowdstrike.event.RuleGroupName': ['SMB Rules'],
        'crowdstrike.event.RemotePort': ['60737'],
        'crowdstrike.event.RuleAction': ['2'],
        'crowdstrike.event.CommandLine': ['System'],
        'kibana.alert.rule.name': ['cs123'],
        'event.kind': ['signal'],
        'crowdstrike.event.EventType': ['FirewallRuleIP4Matched'],
        'kibana.alert.workflow_status': ['open'],
        'kibana.alert.rule.uuid': ['8fc8e415-6977-4369-8cb1-d464086c7a82'],
        'crowdstrike.event.RuleName': ['Inbound SMB Block & Log Private'],
        'kibana.alert.reason': ['event created low alert cs123.'],
        'log.offset': [3982072],
        'crowdstrike.event.RuleId': ['4877172638743447345'],
        'data_stream.type': ['logs'],
        'ecs.version': ['8.11.0'],
        'observer.type': ['agent'],
        'kibana.alert.ancestors.index': ['.ds-logs-crowdstrike.fdr-default-2024.03.19-000001'],
        'agent.version': ['8.12.0'],
        'kibana.alert.depth': [1],
        'crowdstrike.event.PID': ['1859721627331'],
        'crowdstrike.event.ImageFileName': ['System'],
        'crowdstrike.event.LocalAddress': ['10.224.56.169'],
        'kibana.alert.rule.from': ['now-360s'],
        'kibana.alert.rule.parameters': [
          {
            description: '123',
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
            rule_id: 'be1730fe-2db7-4fa4-8113-cebd9c71777d',
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
              'auditbeat-*',
              'endgame-*',
              'filebeat-*',
              'logs-*',
              'packetbeat-*',
              'traces-apm*',
              'winlogbeat-*',
              '-*elastic-cloud-logs-*',
            ],
            query: 'observer.vendor: "crowdstrike" ',
            filters: [],
          },
        ],
        'kibana.alert.rule.revision': [0],
        'kibana.alert.status': ['active'],
        'crowdstrike.event.NetworkProfile': ['2'],
        'kibana.alert.last_detected': ['2024-03-19T12:59:04.151Z'],
        'crowdstrike.event.MatchCount': [1],
        'kibana.alert.original_event.dataset': ['crowdstrike.fdr'],
        'kibana.alert.rule.rule_type_id': ['siem.queryRule'],
        'event.module': ['crowdstrike'],
        'kibana.alert.rule.license': [''],
        'event.timezone': ['+01:00'],
        'kibana.alert.rule.updated_at': ['2024-03-19T12:59:02.502Z'],
        'data_stream.namespace': ['default'],
        'crowdstrike.metadata.customerIDString': ['774694c2ef8c43fdb64ec3056ddfb96d'],
        'crowdstrike.metadata.version': ['1.0'],
        'kibana.alert.rule.created_at': ['2024-03-19T12:56:51.703Z'],
        'kibana.alert.original_event.timezone': ['+01:00'],
        'kibana.space_ids': ['default'],
        'kibana.alert.rule.meta.from': ['1m'],
        'event.dataset': ['crowdstrike.fdr'],
        'kibana.alert.original_time': ['2024-03-19T12:58:40.033Z'],
      },
      true
    );
    return mergeAndReplaceArrays(alert, overrides);
  }
}
