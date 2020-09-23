/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  sampleRuleAlertParams,
  sampleDocNoSortId,
  sampleRuleGuid,
  sampleIdGuid,
  sampleDocWithAncestors,
  sampleRuleSO,
} from './__mocks__/es_results';
import { buildBulkBody, buildSignalFromSequence, buildSignalFromEvent } from './build_bulk_body';
import { SignalHit } from './types';
import { getListArrayMock } from '../../../../common/detection_engine/schemas/types/lists.mock';

describe('buildBulkBody', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('bulk body builds well-defined body', () => {
    const sampleParams = sampleRuleAlertParams();
    const doc = sampleDocNoSortId();
    delete doc._source.source;
    const fakeSignalSourceHit = buildBulkBody({
      doc,
      ruleParams: sampleParams,
      id: sampleRuleGuid,
      name: 'rule-name',
      actions: [],
      createdAt: '2020-01-28T15:58:34.810Z',
      updatedAt: '2020-01-28T15:59:14.004Z',
      createdBy: 'elastic',
      updatedBy: 'elastic',
      interval: '5m',
      enabled: true,
      tags: ['some fake tag 1', 'some fake tag 2'],
      throttle: 'no_actions',
    });
    // Timestamp will potentially always be different so remove it for the test
    // @ts-expect-error
    delete fakeSignalSourceHit['@timestamp'];
    const expected: Omit<SignalHit, '@timestamp'> & { someKey: 'someValue' } = {
      someKey: 'someValue',
      event: {
        kind: 'signal',
      },
      signal: {
        parent: {
          id: sampleIdGuid,
          type: 'event',
          index: 'myFakeSignalIndex',
          depth: 0,
        },
        parents: [
          {
            id: sampleIdGuid,
            type: 'event',
            index: 'myFakeSignalIndex',
            depth: 0,
          },
        ],
        ancestors: [
          {
            id: sampleIdGuid,
            type: 'event',
            index: 'myFakeSignalIndex',
            depth: 0,
          },
        ],
        original_time: '2020-04-20T21:27:45+0000',
        status: 'open',
        rule: {
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
          immutable: false,
          index: ['auditbeat-*', 'filebeat-*', 'packetbeat-*', 'winlogbeat-*'],
          interval: '5m',
          language: 'kuery',
          license: 'Elastic License',
          name: 'rule-name',
          query: 'user.name: root or user.name: admin',
          references: ['http://google.com'],
          severity: 'high',
          severity_mapping: [],
          tags: ['some fake tag 1', 'some fake tag 2'],
          threat: [],
          throttle: 'no_actions',
          type: 'query',
          to: 'now',
          note: '',
          enabled: true,
          created_by: 'elastic',
          updated_by: 'elastic',
          version: 1,
          created_at: fakeSignalSourceHit.signal.rule?.created_at,
          updated_at: fakeSignalSourceHit.signal.rule?.updated_at,
          exceptions_list: getListArrayMock(),
        },
        depth: 1,
      },
    };
    expect(fakeSignalSourceHit).toEqual(expected);
  });

  test('bulk body builds original_event if it exists on the event to begin with', () => {
    const sampleParams = sampleRuleAlertParams();
    const doc = sampleDocNoSortId();
    delete doc._source.source;
    doc._source.event = {
      action: 'socket_opened',
      module: 'system',
      dataset: 'socket',
      kind: 'event',
    };
    const fakeSignalSourceHit = buildBulkBody({
      doc,
      ruleParams: sampleParams,
      id: sampleRuleGuid,
      name: 'rule-name',
      actions: [],
      createdAt: '2020-01-28T15:58:34.810Z',
      updatedAt: '2020-01-28T15:59:14.004Z',
      createdBy: 'elastic',
      updatedBy: 'elastic',
      interval: '5m',
      enabled: true,
      tags: ['some fake tag 1', 'some fake tag 2'],
      throttle: 'no_actions',
    });
    // Timestamp will potentially always be different so remove it for the test
    // @ts-expect-error
    delete fakeSignalSourceHit['@timestamp'];
    const expected: Omit<SignalHit, '@timestamp'> & { someKey: 'someValue' } = {
      someKey: 'someValue',
      event: {
        action: 'socket_opened',
        dataset: 'socket',
        kind: 'signal',
        module: 'system',
      },
      signal: {
        original_event: {
          action: 'socket_opened',
          dataset: 'socket',
          kind: 'event',
          module: 'system',
        },
        parent: {
          id: sampleIdGuid,
          type: 'event',
          index: 'myFakeSignalIndex',
          depth: 0,
        },
        parents: [
          {
            id: sampleIdGuid,
            type: 'event',
            index: 'myFakeSignalIndex',
            depth: 0,
          },
        ],
        ancestors: [
          {
            id: sampleIdGuid,
            type: 'event',
            index: 'myFakeSignalIndex',
            depth: 0,
          },
        ],
        original_time: '2020-04-20T21:27:45+0000',
        status: 'open',
        rule: {
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
          immutable: false,
          index: ['auditbeat-*', 'filebeat-*', 'packetbeat-*', 'winlogbeat-*'],
          interval: '5m',
          language: 'kuery',
          license: 'Elastic License',
          name: 'rule-name',
          query: 'user.name: root or user.name: admin',
          references: ['http://google.com'],
          severity: 'high',
          severity_mapping: [],
          tags: ['some fake tag 1', 'some fake tag 2'],
          type: 'query',
          to: 'now',
          note: '',
          enabled: true,
          created_by: 'elastic',
          updated_by: 'elastic',
          version: 1,
          created_at: fakeSignalSourceHit.signal.rule?.created_at,
          updated_at: fakeSignalSourceHit.signal.rule?.updated_at,
          throttle: 'no_actions',
          threat: [],
          exceptions_list: getListArrayMock(),
        },
        depth: 1,
      },
    };
    expect(fakeSignalSourceHit).toEqual(expected);
  });

  test('bulk body builds original_event if it exists on the event to begin with but no kind information', () => {
    const sampleParams = sampleRuleAlertParams();
    const doc = sampleDocNoSortId();
    delete doc._source.source;
    doc._source.event = {
      action: 'socket_opened',
      module: 'system',
      dataset: 'socket',
    };
    const fakeSignalSourceHit = buildBulkBody({
      doc,
      ruleParams: sampleParams,
      id: sampleRuleGuid,
      name: 'rule-name',
      actions: [],
      createdAt: '2020-01-28T15:58:34.810Z',
      updatedAt: '2020-01-28T15:59:14.004Z',
      createdBy: 'elastic',
      updatedBy: 'elastic',
      interval: '5m',
      enabled: true,
      tags: ['some fake tag 1', 'some fake tag 2'],
      throttle: 'no_actions',
    });
    // Timestamp will potentially always be different so remove it for the test
    // @ts-expect-error
    delete fakeSignalSourceHit['@timestamp'];
    const expected: Omit<SignalHit, '@timestamp'> & { someKey: 'someValue' } = {
      someKey: 'someValue',
      event: {
        action: 'socket_opened',
        dataset: 'socket',
        kind: 'signal',
        module: 'system',
      },
      signal: {
        original_event: {
          action: 'socket_opened',
          dataset: 'socket',
          module: 'system',
        },
        parent: {
          id: sampleIdGuid,
          type: 'event',
          index: 'myFakeSignalIndex',
          depth: 0,
        },
        parents: [
          {
            id: sampleIdGuid,
            type: 'event',
            index: 'myFakeSignalIndex',
            depth: 0,
          },
        ],
        ancestors: [
          {
            id: sampleIdGuid,
            type: 'event',
            index: 'myFakeSignalIndex',
            depth: 0,
          },
        ],
        original_time: '2020-04-20T21:27:45+0000',
        status: 'open',
        rule: {
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
          immutable: false,
          index: ['auditbeat-*', 'filebeat-*', 'packetbeat-*', 'winlogbeat-*'],
          interval: '5m',
          language: 'kuery',
          license: 'Elastic License',
          name: 'rule-name',
          query: 'user.name: root or user.name: admin',
          references: ['http://google.com'],
          severity: 'high',
          severity_mapping: [],
          threat: [],
          tags: ['some fake tag 1', 'some fake tag 2'],
          type: 'query',
          to: 'now',
          note: '',
          enabled: true,
          created_by: 'elastic',
          updated_by: 'elastic',
          version: 1,
          created_at: fakeSignalSourceHit.signal.rule?.created_at,
          updated_at: fakeSignalSourceHit.signal.rule?.updated_at,
          throttle: 'no_actions',
          exceptions_list: getListArrayMock(),
        },
        depth: 1,
      },
    };
    expect(fakeSignalSourceHit).toEqual(expected);
  });

  test('bulk body builds original_event if it exists on the event to begin with with only kind information', () => {
    const sampleParams = sampleRuleAlertParams();
    const doc = sampleDocNoSortId();
    delete doc._source.source;
    doc._source.event = {
      kind: 'event',
    };
    const fakeSignalSourceHit = buildBulkBody({
      doc,
      ruleParams: sampleParams,
      id: sampleRuleGuid,
      name: 'rule-name',
      actions: [],
      createdAt: '2020-01-28T15:58:34.810Z',
      updatedAt: '2020-01-28T15:59:14.004Z',
      createdBy: 'elastic',
      updatedBy: 'elastic',
      interval: '5m',
      enabled: true,
      tags: ['some fake tag 1', 'some fake tag 2'],
      throttle: 'no_actions',
    });
    // Timestamp will potentially always be different so remove it for the test
    // @ts-expect-error
    delete fakeSignalSourceHit['@timestamp'];
    const expected: Omit<SignalHit, '@timestamp'> & { someKey: 'someValue' } = {
      someKey: 'someValue',
      event: {
        kind: 'signal',
      },
      signal: {
        original_event: {
          kind: 'event',
        },
        parent: {
          id: sampleIdGuid,
          type: 'event',
          index: 'myFakeSignalIndex',
          depth: 0,
        },
        parents: [
          {
            id: sampleIdGuid,
            type: 'event',
            index: 'myFakeSignalIndex',
            depth: 0,
          },
        ],
        ancestors: [
          {
            id: sampleIdGuid,
            type: 'event',
            index: 'myFakeSignalIndex',
            depth: 0,
          },
        ],
        original_time: '2020-04-20T21:27:45+0000',
        status: 'open',
        rule: {
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
          immutable: false,
          index: ['auditbeat-*', 'filebeat-*', 'packetbeat-*', 'winlogbeat-*'],
          interval: '5m',
          language: 'kuery',
          license: 'Elastic License',
          name: 'rule-name',
          query: 'user.name: root or user.name: admin',
          references: ['http://google.com'],
          severity: 'high',
          severity_mapping: [],
          tags: ['some fake tag 1', 'some fake tag 2'],
          threat: [],
          type: 'query',
          to: 'now',
          note: '',
          enabled: true,
          created_by: 'elastic',
          updated_by: 'elastic',
          version: 1,
          updated_at: fakeSignalSourceHit.signal.rule?.updated_at,
          created_at: fakeSignalSourceHit.signal.rule?.created_at,
          throttle: 'no_actions',
          exceptions_list: getListArrayMock(),
        },
        depth: 1,
      },
    };
    expect(fakeSignalSourceHit).toEqual(expected);
  });
});

describe('buildSignalFromSequence', () => {
  test('builds a basic signal from a sequence of building blocks', () => {
    const blocks = [sampleDocWithAncestors().hits.hits[0], sampleDocWithAncestors().hits.hits[0]];
    const ruleSO = sampleRuleSO();
    const signal = buildSignalFromSequence(blocks, ruleSO);
    // Timestamp will potentially always be different so remove it for the test
    // @ts-expect-error
    delete signal['@timestamp'];
    const expected: Omit<SignalHit, '@timestamp'> = {
      event: {
        kind: 'signal',
      },
      signal: {
        parents: [
          {
            id: sampleIdGuid,
            rule: '04128c15-0d1b-4716-a4c5-46997ac7f3bd',
            type: 'signal',
            index: 'myFakeSignalIndex',
            depth: 1,
          },
          {
            id: sampleIdGuid,
            rule: '04128c15-0d1b-4716-a4c5-46997ac7f3bd',
            type: 'signal',
            index: 'myFakeSignalIndex',
            depth: 1,
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
            id: sampleIdGuid,
            rule: '04128c15-0d1b-4716-a4c5-46997ac7f3bd',
            type: 'signal',
            index: 'myFakeSignalIndex',
            depth: 1,
          },
          {
            id: 'd5e8eb51-a6a0-456d-8a15-4b79bfec3d71',
            type: 'event',
            index: 'myFakeSignalIndex',
            depth: 0,
          },
          {
            id: sampleIdGuid,
            rule: '04128c15-0d1b-4716-a4c5-46997ac7f3bd',
            type: 'signal',
            index: 'myFakeSignalIndex',
            depth: 1,
          },
        ],
        status: 'open',
        rule: {
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
          immutable: false,
          index: ['auditbeat-*', 'filebeat-*', 'packetbeat-*', 'winlogbeat-*'],
          interval: '5m',
          language: 'kuery',
          license: 'Elastic License',
          name: 'rule-name',
          query: 'user.name: root or user.name: admin',
          references: ['http://google.com'],
          severity: 'high',
          severity_mapping: [],
          tags: ['some fake tag 1', 'some fake tag 2'],
          threat: [],
          type: 'query',
          to: 'now',
          note: '',
          enabled: true,
          created_by: 'sample user',
          updated_by: 'sample user',
          version: 1,
          updated_at: ruleSO.updated_at ?? '',
          created_at: ruleSO.attributes.createdAt,
          throttle: 'no_actions',
          exceptions_list: getListArrayMock(),
        },
        depth: 2,
        group: {
          id: '269c1f5754bff92fb8040283b687258e99b03e8b2ab1262cc20c82442e5de5ea',
        },
      },
    };
    expect(signal).toEqual(expected);
  });
});

describe('buildSignalFromEvent', () => {
  test('builds a basic signal from a single event', () => {
    const ancestor = sampleDocWithAncestors().hits.hits[0];
    delete ancestor._source.source;
    const ruleSO = sampleRuleSO();
    const signal = buildSignalFromEvent(ancestor, ruleSO);
    // Timestamp will potentially always be different so remove it for the test
    // @ts-expect-error
    delete signal['@timestamp'];
    const expected: Omit<SignalHit, '@timestamp'> & { someKey: 'someValue' } = {
      someKey: 'someValue',
      event: {
        kind: 'signal',
      },
      signal: {
        original_time: '2020-04-20T21:27:45+0000',
        parent: {
          id: sampleIdGuid,
          rule: '04128c15-0d1b-4716-a4c5-46997ac7f3bd',
          type: 'signal',
          index: 'myFakeSignalIndex',
          depth: 1,
        },
        parents: [
          {
            id: sampleIdGuid,
            rule: '04128c15-0d1b-4716-a4c5-46997ac7f3bd',
            type: 'signal',
            index: 'myFakeSignalIndex',
            depth: 1,
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
            id: sampleIdGuid,
            rule: '04128c15-0d1b-4716-a4c5-46997ac7f3bd',
            type: 'signal',
            index: 'myFakeSignalIndex',
            depth: 1,
          },
        ],
        status: 'open',
        rule: {
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
          immutable: false,
          index: ['auditbeat-*', 'filebeat-*', 'packetbeat-*', 'winlogbeat-*'],
          interval: '5m',
          language: 'kuery',
          license: 'Elastic License',
          name: 'rule-name',
          query: 'user.name: root or user.name: admin',
          references: ['http://google.com'],
          severity: 'high',
          severity_mapping: [],
          tags: ['some fake tag 1', 'some fake tag 2'],
          threat: [],
          type: 'query',
          to: 'now',
          note: '',
          enabled: true,
          created_by: 'sample user',
          updated_by: 'sample user',
          version: 1,
          updated_at: ruleSO.updated_at ?? '',
          created_at: ruleSO.attributes.createdAt,
          throttle: 'no_actions',
          exceptions_list: getListArrayMock(),
        },
        depth: 2,
      },
    };
    expect(signal).toEqual(expected);
  });
});
