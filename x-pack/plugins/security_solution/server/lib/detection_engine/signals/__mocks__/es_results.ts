/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { set } from '@elastic/safer-lodash-set';
import type {
  SignalSourceHit,
  SignalSearchResponse,
  BulkResponse,
  BulkItem,
  SignalHit,
  WrappedSignalHit,
  AlertAttributes,
  AlertSourceHit,
} from '../types';
import { SavedObject } from '../../../../../../../../src/core/server';
import { loggingSystemMock } from '../../../../../../../../src/core/server/mocks';
import { getListArrayMock } from '../../../../../common/detection_engine/schemas/types/lists.mock';
import { RulesSchema } from '../../../../../common/detection_engine/schemas/response';
import { RuleParams } from '../../schemas/rule_schemas';
import { getThreatMock } from '../../../../../common/detection_engine/schemas/types/threat.mock';
import {
  ALERT_BUILDING_BLOCK_TYPE,
  ALERT_REASON,
  ALERT_RISK_SCORE,
  ALERT_RULE_AUTHOR,
  ALERT_RULE_CATEGORY,
  ALERT_RULE_CONSUMER,
  ALERT_RULE_CREATED_AT,
  ALERT_RULE_CREATED_BY,
  ALERT_RULE_DESCRIPTION,
  ALERT_RULE_ENABLED,
  ALERT_RULE_EXECUTION_UUID,
  ALERT_RULE_FROM,
  ALERT_RULE_INTERVAL,
  ALERT_RULE_LICENSE,
  ALERT_RULE_NAME,
  ALERT_RULE_NAMESPACE_FIELD,
  ALERT_RULE_NOTE,
  ALERT_RULE_PARAMETERS,
  ALERT_RULE_PRODUCER,
  ALERT_RULE_REFERENCES,
  ALERT_RULE_RULE_ID,
  ALERT_RULE_RULE_NAME_OVERRIDE,
  ALERT_RULE_TAGS,
  ALERT_RULE_TO,
  ALERT_RULE_TYPE,
  ALERT_RULE_TYPE_ID,
  ALERT_RULE_UPDATED_AT,
  ALERT_RULE_UPDATED_BY,
  ALERT_RULE_UUID,
  ALERT_RULE_VERSION,
  ALERT_SEVERITY,
  ALERT_STATUS,
  ALERT_STATUS_ACTIVE,
  ALERT_UUID,
  ALERT_WORKFLOW_STATUS,
  EVENT_KIND,
  SPACE_IDS,
  TIMESTAMP,
} from '@kbn/rule-data-utils';
import {
  ALERT_ANCESTORS,
  ALERT_DEPTH,
  ALERT_ORIGINAL_TIME,
  ALERT_RULE_ACTIONS,
  ALERT_RULE_EXCEPTIONS_LIST,
  ALERT_RULE_FALSE_POSITIVES,
  ALERT_RULE_IMMUTABLE,
  ALERT_RULE_MAX_SIGNALS,
  ALERT_RULE_RISK_SCORE_MAPPING,
  ALERT_RULE_SEVERITY_MAPPING,
  ALERT_RULE_THREAT,
  ALERT_RULE_THROTTLE,
  ALERT_RULE_TIMELINE_ID,
  ALERT_RULE_TIMELINE_TITLE,
  ALERT_RULE_TIMESTAMP_OVERRIDE,
} from '../../../../../common/field_maps/field_names';
import { SERVER_APP_ID } from '../../../../../common/constants';

export const sampleRuleSO = <T extends RuleParams>(params: T): SavedObject<AlertAttributes<T>> => {
  return {
    id: '04128c15-0d1b-4716-a4c5-46997ac7f3bd',
    type: 'alert',
    version: '1',
    updated_at: '2020-03-27T22:55:59.577Z',
    attributes: {
      actions: [],
      alertTypeId: 'siem.signals',
      enabled: true,
      name: 'rule-name',
      tags: ['some fake tag 1', 'some fake tag 2'],
      createdBy: 'sample user',
      createdAt: '2020-03-27T22:55:59.577Z',
      updatedBy: 'sample user',
      schedule: {
        interval: '5m',
      },
      throttle: 'no_actions',
      params,
    },
    references: [],
  };
};

export const expectedRule = (): RulesSchema => {
  return {
    actions: [],
    author: ['Elastic'],
    building_block_type: 'default',
    id: '04128c15-0d1b-4716-a4c5-46997ac7f3bd',
    rule_id: 'rule-1',
    false_positives: [],
    max_signals: 10000,
    risk_score: 50,
    risk_score_mapping: [],
    output_index: '.siem-signals',
    description: 'Detecting root and admin users',
    from: 'now-6m',
    filters: [
      {
        query: {
          match_phrase: {
            'host.name': 'some-host',
          },
        },
      },
    ],
    immutable: false,
    index: ['auditbeat-*', 'filebeat-*', 'packetbeat-*', 'winlogbeat-*'],
    interval: '5m',
    language: 'kuery',
    license: 'Elastic License',
    meta: {
      someMeta: 'someField',
    },
    name: 'rule-name',
    query: 'user.name: root or user.name: admin',
    references: ['http://example.com', 'https://example.com'],
    severity: 'high',
    severity_mapping: [],
    tags: ['some fake tag 1', 'some fake tag 2'],
    threat: getThreatMock(),
    type: 'query',
    to: 'now',
    note: '# Investigative notes',
    enabled: true,
    created_by: 'sample user',
    updated_by: 'sample user',
    version: 1,
    updated_at: '2020-03-27T22:55:59.577Z',
    created_at: '2020-03-27T22:55:59.577Z',
    throttle: 'no_actions',
    timeline_id: 'some-timeline-id',
    timeline_title: 'some-timeline-title',
    exceptions_list: getListArrayMock(),
  };
};

export const sampleDocNoSortIdNoVersion = (someUuid: string = sampleIdGuid): SignalSourceHit => ({
  _index: 'myFakeSignalIndex',
  _score: 100,
  _id: someUuid,
  _source: {
    someKey: 'someValue',
    '@timestamp': '2020-04-20T21:27:45+0000',
  },
});

export const sampleDocWithSortId = (
  someUuid: string = sampleIdGuid,
  sortIds: string[] = ['1234567891111', '2233447556677'],
  ip?: string | string[],
  destIp?: string | string[]
): SignalSourceHit => ({
  _index: 'myFakeSignalIndex',
  _score: 100,
  _version: 1,
  _id: someUuid,
  _source: {
    someKey: 'someValue',
    '@timestamp': '2020-04-20T21:27:45+0000',
    source: {
      ip: ip ?? '127.0.0.1',
    },
    destination: {
      ip: destIp ?? '127.0.0.1',
    },
  },
  fields: {
    someKey: ['someValue'],
    '@timestamp': ['2020-04-20T21:27:45+0000'],
    'source.ip': ip ? (Array.isArray(ip) ? ip : [ip]) : ['127.0.0.1'],
    'destination.ip': destIp ? (Array.isArray(destIp) ? destIp : [destIp]) : ['127.0.0.1'],
  },
  sort: sortIds,
});

export const sampleDocNoSortId = (
  someUuid: string = sampleIdGuid,
  ip?: string
): SignalSourceHit & { _source: Required<SignalSourceHit>['_source'] } => ({
  _index: 'myFakeSignalIndex',
  _score: 100,
  _version: 1,
  _id: someUuid,
  _source: {
    someKey: 'someValue',
    '@timestamp': '2020-04-20T21:27:45+0000',
    source: {
      ip: ip ?? '127.0.0.1',
    },
  },
  fields: {
    someKey: ['someValue'],
    '@timestamp': ['2020-04-20T21:27:45+0000'],
    'source.ip': [ip ?? '127.0.0.1'],
  },
  sort: [],
});

export const sampleAlertDocNoSortId = (
  someUuid: string = sampleIdGuid,
  ip?: string
): SignalSourceHit & { _source: Required<SignalSourceHit>['_source'] } => ({
  ...sampleDocNoSortId(someUuid, ip),
  _source: {
    event: {
      kind: 'signal',
    },
    signal: {
      ancestors: [
        {
          id: 'd5e8eb51-a6a0-456d-8a15-4b79bfec3d71',
          type: 'event',
          index: 'myFakeSignalIndex',
          depth: 0,
        },
      ],
      reason: 'reasonable reason',
      rule: {
        id: '2e051244-b3c6-4779-a241-e1b4f0beceb9',
        description: 'Descriptive description',
      },
      status: 'open',
    },
  },
  fields: {},
});

export const sampleAlertDocAADNoSortId = (
  someUuid: string = sampleIdGuid,
  ip?: string
): AlertSourceHit & { _source: Required<AlertSourceHit>['_source'] } => ({
  _index: 'myFakeSignalIndex',
  _score: 100,
  _version: 1,
  _id: someUuid,
  _source: {
    someKey: 'someValue',

    [TIMESTAMP]: '2020-04-20T21:27:45+0000',
    [SPACE_IDS]: ['default'],
    [EVENT_KIND]: 'signal',
    [ALERT_RULE_CONSUMER]: SERVER_APP_ID,
    [ALERT_ANCESTORS]: [
      {
        id: 'd5e8eb51-a6a0-456d-8a15-4b79bfec3d71',
        type: 'event',
        index: 'myFakeSignalIndex',
        depth: 0,
        rule: undefined,
      },
    ],
    [ALERT_BUILDING_BLOCK_TYPE]: undefined,
    [ALERT_ORIGINAL_TIME]: undefined,
    [ALERT_STATUS]: ALERT_STATUS_ACTIVE,
    [ALERT_WORKFLOW_STATUS]: 'open',
    [ALERT_DEPTH]: 1,
    [ALERT_REASON]: 'reasonable reason',
    [ALERT_SEVERITY]: 'high',
    [ALERT_RISK_SCORE]: 50,
    [ALERT_RULE_ACTIONS]: [],
    [ALERT_RULE_AUTHOR]: ['Elastic'],
    [ALERT_RULE_CATEGORY]: 'Custom Query Rule',
    [ALERT_RULE_CREATED_AT]: '2020-03-27T22:55:59.577Z',
    [ALERT_RULE_CREATED_BY]: 'sample user',
    [ALERT_RULE_DESCRIPTION]: 'Descriptive description',
    [ALERT_RULE_ENABLED]: true,
    [ALERT_RULE_EXCEPTIONS_LIST]: [],
    [ALERT_RULE_EXECUTION_UUID]: '97e8f53a-4971-4935-bb54-9b8f86930cc7',
    [ALERT_RULE_FALSE_POSITIVES]: [],
    [ALERT_RULE_FROM]: 'now-6m',
    [ALERT_RULE_IMMUTABLE]: false,
    [ALERT_RULE_INTERVAL]: '5m',
    [ALERT_RULE_LICENSE]: 'Elastic License',
    [ALERT_RULE_MAX_SIGNALS]: 10000,
    [ALERT_RULE_NAME]: 'rule-name',
    [ALERT_RULE_NAMESPACE_FIELD]: undefined,
    [ALERT_RULE_NOTE]: undefined,
    [ALERT_RULE_PRODUCER]: 'siem',
    [ALERT_RULE_REFERENCES]: ['http://example.com', 'https://example.com'],
    [ALERT_RULE_RISK_SCORE_MAPPING]: [],
    [ALERT_RULE_RULE_ID]: 'rule-1',
    [ALERT_RULE_RULE_NAME_OVERRIDE]: undefined,
    [ALERT_RULE_TYPE_ID]: 'siem.queryRule',
    [ALERT_RULE_SEVERITY_MAPPING]: [],
    [ALERT_RULE_TAGS]: ['some fake tag 1', 'some fake tag 2'],
    [ALERT_RULE_THREAT]: [
      {
        framework: 'MITRE ATT&CK',
        tactic: {
          id: 'TA0000',
          name: 'test tactic',
          reference: 'https://attack.mitre.org/tactics/TA0000/',
        },
        technique: [
          {
            id: 'T0000',
            name: 'test technique',
            reference: 'https://attack.mitre.org/techniques/T0000/',
            subtechnique: [
              {
                id: 'T0000.000',
                name: 'test subtechnique',
                reference: 'https://attack.mitre.org/techniques/T0000/000/',
              },
            ],
          },
        ],
      },
    ],
    [ALERT_RULE_THROTTLE]: 'no_actions',
    [ALERT_RULE_TIMELINE_ID]: 'some-timeline-id',
    [ALERT_RULE_TIMELINE_TITLE]: 'some-timeline-title',
    [ALERT_RULE_TIMESTAMP_OVERRIDE]: undefined,
    [ALERT_RULE_TO]: 'now',
    [ALERT_RULE_TYPE]: 'query',
    [ALERT_RULE_UPDATED_AT]: '2020-03-27T22:55:59.577Z',
    [ALERT_RULE_UPDATED_BY]: 'sample user',
    [ALERT_RULE_UUID]: '2e051244-b3c6-4779-a241-e1b4f0beceb9',
    [ALERT_RULE_VERSION]: 1,
    source: {
      ip: ip ?? '127.0.0.1',
    },
    [ALERT_UUID]: someUuid,
    'kibana.alert.rule.risk_score': 50,
    'kibana.alert.rule.severity': 'high',
    'kibana.alert.rule.building_block_type': undefined,
    [ALERT_RULE_PARAMETERS]: {
      description: 'Descriptive description',
      meta: { someMeta: 'someField' },
      timeline_id: 'some-timeline-id',
      timeline_title: 'some-timeline-title',
      risk_score: 50,
      severity: 'high',
      note: 'Noteworthy notes',
      license: 'Elastic License',
      author: ['Elastic'],
      false_positives: [],
      from: 'now-6m',
      rule_id: 'rule-1',
      max_signals: 10000,
      risk_score_mapping: [],
      severity_mapping: [],
      to: 'now',
      references: ['http://example.com', 'https://example.com'],
      version: 1,
      immutable: false,
      namespace: 'default',
      output_index: '',
      building_block_type: undefined,
      exceptions_list: [],
      rule_name_override: undefined,
      timestamp_override: undefined,
      threat: [
        {
          framework: 'MITRE ATT&CK',
          tactic: {
            id: 'TA0000',
            name: 'test tactic',
            reference: 'https://attack.mitre.org/tactics/TA0000/',
          },
          technique: [
            {
              id: 'T0000',
              name: 'test technique',
              reference: 'https://attack.mitre.org/techniques/T0000/',
              subtechnique: [
                {
                  id: 'T0000.000',
                  name: 'test subtechnique',
                  reference: 'https://attack.mitre.org/techniques/T0000/000/',
                },
              ],
            },
          ],
        },
      ],
    },
  },
  fields: {
    someKey: ['someValue'],
    '@timestamp': ['2020-04-20T21:27:45+0000'],
    'source.ip': [ip ?? '127.0.0.1'],
  },
  sort: [],
});

export const sampleDocNoSortIdWithTimestamp = (
  someUuid: string = sampleIdGuid,
  ip?: string
): SignalSourceHit & {
  _source: Required<SignalSourceHit>['_source'] & { '@timestamp': string };
} => {
  const doc = sampleDocNoSortId(someUuid, ip);
  return {
    ...doc,
    _source: {
      ...doc._source,
      '@timestamp': new Date().toISOString(),
    },
  };
};

export const sampleAlertDocNoSortIdWithTimestamp = (
  someUuid: string = sampleIdGuid,
  ip?: string
): SignalSourceHit & {
  _source: Required<SignalSourceHit>['_source'] & { '@timestamp': string };
} => {
  const doc = sampleAlertDocNoSortId(someUuid, ip);
  return {
    ...doc,
    _source: {
      ...doc._source,
      '@timestamp': new Date().toISOString(),
    },
  };
};

export const sampleAlertDocAADNoSortIdWithTimestamp = (
  someUuid: string = sampleIdGuid,
  ip?: string
): AlertSourceHit & {
  _source: Required<AlertSourceHit>['_source'] & { '@timestamp': string };
} => {
  const doc = sampleAlertDocAADNoSortId(someUuid, ip);
  return {
    ...doc,
    _source: {
      ...doc._source,
      '@timestamp': new Date().toISOString(),
    },
  };
};

export const sampleDocSeverity = (severity?: unknown, fieldName?: string): SignalSourceHit => {
  const doc = {
    _index: 'myFakeSignalIndex',
    _type: 'doc',
    _score: 100,
    _version: 1,
    _id: sampleIdGuid,
    _source: {
      someKey: 'someValue',
      '@timestamp': '2020-04-20T21:27:45+0000',
    },
    sort: [],
  };

  set(doc._source, fieldName ?? 'event.severity', severity);
  return doc;
};

export const sampleDocRiskScore = (riskScore?: unknown): SignalSourceHit => ({
  _index: 'myFakeSignalIndex',
  _score: 100,
  _version: 1,
  _id: sampleIdGuid,
  _source: {
    someKey: 'someValue',
    '@timestamp': '2020-04-20T21:27:45+0000',
    event: {
      risk: riskScore,
    },
  },
  sort: [],
});

export const sampleEmptyDocSearchResults = (): SignalSearchResponse => ({
  took: 10,
  timed_out: false,
  _shards: {
    total: 10,
    successful: 10,
    failed: 0,
    skipped: 0,
  },
  hits: {
    total: 0,
    max_score: 100,
    hits: [],
  },
});

export const sampleWrappedSignalHit = (): WrappedSignalHit => {
  return {
    _index: 'myFakeSignalIndex',
    _id: sampleIdGuid,
    _source: sampleSignalHit(),
  };
};

export const sampleDocWithAncestors = (): SignalSearchResponse & {
  hits: { hits: Array<ReturnType<typeof sampleDocNoSortId>> };
} => {
  const sampleDoc = sampleDocNoSortId();
  delete sampleDoc.sort;
  delete sampleDoc._source.source;
  sampleDoc._source.signal = {
    parent: {
      id: 'd5e8eb51-a6a0-456d-8a15-4b79bfec3d71',
      type: 'event',
      index: 'myFakeSignalIndex',
      depth: 0,
    },
    ancestors: [
      {
        id: 'd5e8eb51-a6a0-456d-8a15-4b79bfec3d71',
        type: 'event',
        index: 'myFakeSignalIndex',
        depth: 0,
      },
    ],
    rule: {
      id: '04128c15-0d1b-4716-a4c5-46997ac7f3bd',
    },
    depth: 1,
  };

  return {
    took: 10,
    timed_out: false,
    _shards: {
      total: 10,
      successful: 10,
      failed: 0,
      skipped: 0,
    },
    hits: {
      total: 0,
      max_score: 100,
      hits: [sampleDoc],
    },
  };
};

export const sampleSignalHit = (): SignalHit => ({
  '@timestamp': '2020-04-20T21:27:45+0000',
  event: {
    kind: 'signal',
  },
  signal: {
    parents: [
      {
        id: 'd5e8eb51-a6a0-456d-8a15-4b79bfec3d71',
        type: 'event',
        index: 'myFakeSignalIndex',
        depth: 0,
      },
      {
        id: '730ddf9e-5a00-4f85-9ddf-5878ca511a87',
        type: 'event',
        index: 'myFakeSignalIndex',
        depth: 0,
      },
    ],
    ancestors: [
      {
        id: 'd5e8eb51-a6a0-456d-8a15-4b79bfec3d71',
        type: 'event',
        index: 'myFakeSignalIndex',
        depth: 0,
      },
      {
        id: '730ddf9e-5a00-4f85-9ddf-5878ca511a87',
        type: 'event',
        index: 'myFakeSignalIndex',
        depth: 0,
      },
    ],
    status: 'open',
    rule: {
      author: [],
      id: '7a7065d7-6e8b-4aae-8d20-c93613dec9f9',
      created_at: '2020-04-20T21:27:45+0000',
      updated_at: '2020-04-20T21:27:45+0000',
      created_by: 'elastic',
      description: 'some description',
      enabled: true,
      false_positives: ['false positive 1', 'false positive 2'],
      from: 'now-6m',
      immutable: false,
      name: 'Query with a rule id',
      query: 'user.name: root or user.name: admin',
      references: ['test 1', 'test 2'],
      severity: 'high',
      severity_mapping: [],
      updated_by: 'elastic_kibana',
      tags: ['some fake tag 1', 'some fake tag 2'],
      to: 'now',
      type: 'query',
      threat: [],
      version: 1,
      output_index: '.siem-signals-default',
      max_signals: 100,
      risk_score: 55,
      risk_score_mapping: [],
      language: 'kuery',
      rule_id: 'query-rule-id',
      interval: '5m',
      exceptions_list: getListArrayMock(),
    },
    depth: 1,
  },
});

export const sampleThresholdSignalHit = (): SignalHit => ({
  '@timestamp': '2020-04-20T21:27:45+0000',
  event: {
    kind: 'signal',
  },
  signal: {
    parents: [],
    ancestors: [],
    original_time: '2021-02-16T17:37:34.275Z',
    status: 'open',
    threshold_result: {
      count: 72,
      terms: [{ field: 'host.name', value: 'a hostname' }],
      cardinality: [{ field: 'process.name', value: 6 }],
      from: '2021-02-16T17:31:34.275Z',
    },
    rule: {
      author: [],
      id: '7a7065d7-6e8b-4aae-8d20-c93613dec9f9',
      created_at: '2020-04-20T21:27:45+0000',
      updated_at: '2020-04-20T21:27:45+0000',
      created_by: 'elastic',
      description: 'some description',
      enabled: true,
      false_positives: ['false positive 1', 'false positive 2'],
      from: 'now-6m',
      immutable: false,
      name: 'Query with a rule id',
      query: 'user.name: root or user.name: admin',
      references: ['test 1', 'test 2'],
      severity: 'high',
      severity_mapping: [],
      threshold: {
        field: ['host.name'],
        value: 5,
        cardinality: [
          {
            field: 'process.name',
            value: 2,
          },
        ],
      },
      updated_by: 'elastic_kibana',
      tags: ['some fake tag 1', 'some fake tag 2'],
      to: 'now',
      type: 'query',
      threat: [],
      version: 1,
      output_index: '.siem-signals-default',
      max_signals: 100,
      risk_score: 55,
      risk_score_mapping: [],
      language: 'kuery',
      rule_id: 'query-rule-id',
      interval: '5m',
      exceptions_list: getListArrayMock(),
    },
    depth: 1,
  },
});

const sampleThresholdHit = sampleThresholdSignalHit();
export const sampleLegacyThresholdSignalHit = (): unknown => ({
  ...sampleThresholdHit,
  signal: {
    ...sampleThresholdHit.signal,
    rule: {
      ...sampleThresholdHit.signal.rule,
      threshold: {
        field: 'host.name',
        value: 5,
      },
    },
    threshold_result: {
      count: 72,
      value: 'a hostname',
    },
  },
});

export const sampleThresholdSignalHitWithMitigatedDupes = (): unknown => ({
  ...sampleThresholdHit,
  signal: {
    ...sampleThresholdHit.signal,
    threshold_result: {
      ...sampleThresholdHit.signal.threshold_result,
      from: '2021-02-16T17:34:34.275Z',
    },
  },
});

export const sampleThresholdSignalHitWithEverything = (): unknown => ({
  ...sampleThresholdHit,
  signal: {
    ...sampleThresholdHit.signal,
    rule: {
      ...sampleThresholdHit.signal.rule,
      threshold: {
        field: ['host.name', 'event.category', 'source.ip'],
        value: 5,
        cardinality: [
          {
            field: 'process.name',
            value: 2,
          },
        ],
      },
    },
    threshold_result: {
      count: 22,
      terms: [
        { field: 'host.name', value: 'a hostname' },
        { field: 'event.category', value: 'network' },
        { field: 'source.ip', value: '192.168.0.1' },
      ],
      cardinality: [{ field: 'process.name', value: 3 }],
      from: '2021-02-16T17:34:34.275Z',
    },
  },
});

export const sampleWrappedThresholdSignalHit = (): WrappedSignalHit => {
  return {
    _index: 'myFakeSignalIndex',
    _id: sampleIdGuid,
    _source: sampleThresholdSignalHit(),
  };
};

export const sampleWrappedLegacyThresholdSignalHit = (): WrappedSignalHit => {
  return {
    _index: 'myFakeSignalIndex',
    _id: 'adb9d636-fbbe-4962-ac1c-e282f3ec5879',
    _source: sampleLegacyThresholdSignalHit() as SignalHit,
  };
};

export const sampleBulkCreateDuplicateResult = {
  took: 60,
  errors: true,
  items: [
    {
      create: {
        _index: 'test',
        _type: '_doc',
        _id: '4',
        _version: 1,
        result: 'created',
        _shards: {
          total: 2,
          successful: 1,
          failed: 0,
        },
        _seq_no: 1,
        _primary_term: 1,
        status: 201,
      },
    },
    {
      create: {
        _index: 'test',
        _type: '_doc',
        _id: '4',
        status: 409,
        error: {
          type: 'version_conflict_engine_exception',
          reason: '[4]: version conflict, document already exists (current version [1])',
          index_uuid: 'cXmq4Rt3RGGswDTTwZFzvA',
          shard: '0',
          index: 'test',
        },
      },
    },
    {
      create: {
        _index: 'test',
        _type: '_doc',
        _id: '4',
        status: 409,
        error: {
          type: 'version_conflict_engine_exception',
          reason: '[4]: version conflict, document already exists (current version [1])',
          index_uuid: 'cXmq4Rt3RGGswDTTwZFzvA',
          shard: '0',
          index: 'test',
        },
      },
    },
  ],
};

export const sampleBulkCreateErrorResult = {
  ...sampleBulkCreateDuplicateResult,
  items: [
    ...sampleBulkCreateDuplicateResult.items,
    {
      create: {
        _index: 'test',
        _type: '_doc',
        _id: '5',
        status: 500,
        error: {
          type: 'internal_server_error',
          reason: '[4]: internal server error',
          index_uuid: 'cXmq4Rt3RGGswDTTwZFzvA',
          shard: '0',
          index: 'test',
        },
      },
    },
  ],
};

export const sampleDocSearchResultsNoSortId = (
  someUuid: string = sampleIdGuid
): SignalSearchResponse & {
  hits: { hits: Array<ReturnType<typeof sampleDocNoSortId>> };
} => ({
  took: 10,
  timed_out: false,
  _shards: {
    total: 10,
    successful: 10,
    failed: 0,
    skipped: 0,
  },
  hits: {
    total: 100,
    max_score: 100,
    hits: [
      {
        ...sampleDocNoSortId(someUuid),
      },
    ],
  },
});

export const sampleDocSearchResultsNoSortIdNoVersion = (
  someUuid: string = sampleIdGuid
): SignalSearchResponse => ({
  took: 10,
  timed_out: false,
  _shards: {
    total: 10,
    successful: 10,
    failed: 0,
    skipped: 0,
  },
  hits: {
    total: 100,
    max_score: 100,
    hits: [
      {
        ...sampleDocNoSortIdNoVersion(someUuid),
      },
    ],
  },
});

export const sampleDocSearchResultsNoSortIdNoHits = (
  someUuid: string = sampleIdGuid
): SignalSearchResponse => ({
  took: 10,
  timed_out: false,
  _shards: {
    total: 10,
    successful: 10,
    failed: 0,
    skipped: 0,
  },
  hits: {
    total: 0,
    max_score: 100,
    hits: [
      {
        ...sampleDocNoSortId(someUuid),
      },
    ],
  },
});

export const repeatedHitsWithSortId = (
  count: number,
  guids: string[],
  ips?: Array<string | string[]>,
  destIps?: Array<string | string[]>,
  sortIds?: string[]
): SignalSourceHit[] => {
  return Array.from({ length: count }).map((x, index) => ({
    ...sampleDocWithSortId(
      guids[index],
      sortIds,
      ips ? ips[index] : '127.0.0.1',
      destIps ? destIps[index] : '127.0.0.1'
    ),
  }));
};

export const repeatedSearchResultsWithSortId = (
  total: number,
  pageSize: number,
  guids: string[],
  ips?: Array<string | string[]>,
  destIps?: Array<string | string[]>,
  sortIds?: string[]
): SignalSearchResponse => ({
  took: 10,
  timed_out: false,
  _shards: {
    total: 10,
    successful: 10,
    failed: 0,
    skipped: 0,
  },
  hits: {
    total,
    max_score: 100,
    hits: repeatedHitsWithSortId(pageSize, guids, ips, destIps, sortIds),
  },
});

export const repeatedSearchResultsWithNoSortId = (
  total: number,
  pageSize: number,
  guids: string[],
  ips?: string[]
): SignalSearchResponse => ({
  took: 10,
  timed_out: false,
  _shards: {
    total: 10,
    successful: 10,
    failed: 0,
    skipped: 0,
  },
  hits: {
    total,
    max_score: 100,
    hits: Array.from({ length: pageSize }).map((x, index) => ({
      ...sampleDocNoSortId(guids[index], ips ? ips[index] : '127.0.0.1'),
    })),
  },
});

export const sampleDocSearchResultsWithSortId = (
  someUuid: string = sampleIdGuid
): SignalSearchResponse => ({
  took: 10,
  timed_out: false,
  _shards: {
    total: 10,
    successful: 10,
    failed: 0,
    skipped: 0,
  },
  hits: {
    total: 1,
    max_score: 100,
    hits: [
      {
        ...sampleDocWithSortId(someUuid),
      },
    ],
  },
});

export const sampleRuleGuid = '04128c15-0d1b-4716-a4c5-46997ac7f3bd';
export const sampleIdGuid = 'e1e08ddc-5e37-49ff-a258-5393aa44435a';

export const mockLogger = loggingSystemMock.createLogger();

export const sampleBulkErrorItem = (
  {
    status,
    reason,
  }: {
    status: number;
    reason: string;
  } = { status: 400, reason: 'Invalid call' }
): BulkItem => {
  return {
    create: {
      _index: 'mock_index',
      _id: '123',
      _version: 1,
      status,
      _shards: {
        total: 1,
        successful: 0,
        failed: 1,
      },
      error: {
        type: 'Invalid',
        reason,
        shard: 'shard 123',
        index: 'mock_index',
      },
    },
  };
};

export const sampleBulkItem = (): BulkItem => {
  return {
    create: {
      _index: 'mock_index',
      _id: '123',
      _version: 1,
      status: 200,
      result: 'some result here',
      _shards: {
        total: 1,
        successful: 1,
        failed: 0,
      },
    },
  };
};

export const sampleEmptyBulkResponse = (): BulkResponse => ({
  took: 0,
  errors: false,
  items: [],
});

export const sampleBulkError = (): BulkResponse => ({
  took: 0,
  errors: true,
  items: [sampleBulkErrorItem()],
});

export const sampleBulkResponse = (): BulkResponse => ({
  took: 0,
  errors: true,
  items: [sampleBulkItem()],
});
