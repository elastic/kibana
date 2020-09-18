/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { sampleDocNoSortId } from './__mocks__/es_results';
import { buildSignal, buildParent, buildAncestors, additionalSignalFields } from './build_signal';
import { Signal, Ancestor } from './types';
import { getPartialRulesSchemaMock } from '../../../../common/detection_engine/schemas/response/rules_schema.mocks';

describe('buildSignal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('it builds a signal as expected without original_event if event does not exist', () => {
    const doc = sampleDocNoSortId('d5e8eb51-a6a0-456d-8a15-4b79bfec3d71');
    delete doc._source.event;
    const rule = getPartialRulesSchemaMock();
    const signal = {
      ...buildSignal([doc], rule),
      ...additionalSignalFields(doc),
    };
    const expected: Signal = {
      parent: {
        id: 'd5e8eb51-a6a0-456d-8a15-4b79bfec3d71',
        type: 'event',
        index: 'myFakeSignalIndex',
        depth: 0,
      },
      parents: [
        {
          id: 'd5e8eb51-a6a0-456d-8a15-4b79bfec3d71',
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
      ],
      original_time: '2020-04-20T21:27:45+0000',
      status: 'open',
      rule: {
        created_by: 'elastic',
        description: 'Detecting root and admin users',
        enabled: true,
        false_positives: [],
        from: 'now-6m',
        id: '04128c15-0d1b-4716-a4c5-46997ac7f3bd',
        immutable: false,
        index: ['auditbeat-*', 'filebeat-*', 'packetbeat-*', 'winlogbeat-*'],
        interval: '5m',
        risk_score: 50,
        rule_id: 'rule-1',
        language: 'kuery',
        max_signals: 100,
        name: 'Detect Root/Admin Users',
        output_index: '.siem-signals',
        query: 'user.name: root or user.name: admin',
        references: ['http://www.example.com', 'https://ww.example.com'],
        severity: 'high',
        updated_by: 'elastic',
        tags: ['some fake tag 1', 'some fake tag 2'],
        to: 'now',
        type: 'query',
        note: '',
        updated_at: signal.rule.updated_at,
        created_at: signal.rule.created_at,
      },
      depth: 1,
    };
    expect(signal).toEqual(expected);
  });

  test('it builds a signal as expected with original_event if is present', () => {
    const doc = sampleDocNoSortId('d5e8eb51-a6a0-456d-8a15-4b79bfec3d71');
    doc._source.event = {
      action: 'socket_opened',
      dataset: 'socket',
      kind: 'event',
      module: 'system',
    };
    const rule = getPartialRulesSchemaMock();
    const signal = {
      ...buildSignal([doc], rule),
      ...additionalSignalFields(doc),
    };
    const expected: Signal = {
      parent: {
        id: 'd5e8eb51-a6a0-456d-8a15-4b79bfec3d71',
        type: 'event',
        index: 'myFakeSignalIndex',
        depth: 0,
      },
      parents: [
        {
          id: 'd5e8eb51-a6a0-456d-8a15-4b79bfec3d71',
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
      ],
      original_time: '2020-04-20T21:27:45+0000',
      original_event: {
        action: 'socket_opened',
        dataset: 'socket',
        kind: 'event',
        module: 'system',
      },
      status: 'open',
      rule: {
        created_by: 'elastic',
        description: 'Detecting root and admin users',
        enabled: true,
        false_positives: [],
        from: 'now-6m',
        id: '04128c15-0d1b-4716-a4c5-46997ac7f3bd',
        immutable: false,
        index: ['auditbeat-*', 'filebeat-*', 'packetbeat-*', 'winlogbeat-*'],
        interval: '5m',
        risk_score: 50,
        rule_id: 'rule-1',
        language: 'kuery',
        max_signals: 100,
        name: 'Detect Root/Admin Users',
        output_index: '.siem-signals',
        query: 'user.name: root or user.name: admin',
        references: ['http://www.example.com', 'https://ww.example.com'],
        severity: 'high',
        updated_by: 'elastic',
        tags: ['some fake tag 1', 'some fake tag 2'],
        to: 'now',
        type: 'query',
        note: '',
        updated_at: signal.rule.updated_at,
        created_at: signal.rule.created_at,
      },
      depth: 1,
    };
    expect(signal).toEqual(expected);
  });

  test('it builds a ancestor correctly if the parent does not exist', () => {
    const doc = sampleDocNoSortId('d5e8eb51-a6a0-456d-8a15-4b79bfec3d71');
    doc._source.event = {
      action: 'socket_opened',
      dataset: 'socket',
      kind: 'event',
      module: 'system',
    };
    const signal = buildParent(doc);
    const expected: Ancestor = {
      id: 'd5e8eb51-a6a0-456d-8a15-4b79bfec3d71',
      type: 'event',
      index: 'myFakeSignalIndex',
      depth: 0,
    };
    expect(signal).toEqual(expected);
  });

  test('it builds a ancestor correctly if the parent does exist', () => {
    const doc = sampleDocNoSortId('d5e8eb51-a6a0-456d-8a15-4b79bfec3d71');
    doc._source.event = {
      action: 'socket_opened',
      dataset: 'socket',
      kind: 'event',
      module: 'system',
    };
    doc._source.signal = {
      parents: [
        {
          id: '730ddf9e-5a00-4f85-9ddf-5878ca511a87',
          type: 'event',
          index: 'myFakeSignalIndex',
          depth: 0,
        },
      ],
      ancestors: [
        {
          id: '730ddf9e-5a00-4f85-9ddf-5878ca511a87',
          type: 'event',
          index: 'myFakeSignalIndex',
          depth: 0,
        },
      ],
      depth: 1,
      rule: {
        id: '98c0bf9e-4d38-46f4-9a6a-8a820426256b',
      },
    };
    const signal = buildParent(doc);
    const expected: Ancestor = {
      rule: '98c0bf9e-4d38-46f4-9a6a-8a820426256b',
      id: 'd5e8eb51-a6a0-456d-8a15-4b79bfec3d71',
      type: 'signal',
      index: 'myFakeSignalIndex',
      depth: 1,
    };
    expect(signal).toEqual(expected);
  });

  test('it builds a signal ancestor correctly if the parent does not exist', () => {
    const doc = sampleDocNoSortId('d5e8eb51-a6a0-456d-8a15-4b79bfec3d71');
    doc._source.event = {
      action: 'socket_opened',
      dataset: 'socket',
      kind: 'event',
      module: 'system',
    };
    const signal = buildAncestors(doc);
    const expected: Ancestor[] = [
      {
        id: 'd5e8eb51-a6a0-456d-8a15-4b79bfec3d71',
        type: 'event',
        index: 'myFakeSignalIndex',
        depth: 0,
      },
    ];
    expect(signal).toEqual(expected);
  });

  test('it builds a signal ancestor correctly if the parent does exist', () => {
    const doc = sampleDocNoSortId('d5e8eb51-a6a0-456d-8a15-4b79bfec3d71');
    doc._source.event = {
      action: 'socket_opened',
      dataset: 'socket',
      kind: 'event',
      module: 'system',
    };
    doc._source.signal = {
      parents: [
        {
          id: '730ddf9e-5a00-4f85-9ddf-5878ca511a87',
          type: 'event',
          index: 'myFakeSignalIndex',
          depth: 0,
        },
      ],
      ancestors: [
        {
          id: '730ddf9e-5a00-4f85-9ddf-5878ca511a87',
          type: 'event',
          index: 'myFakeSignalIndex',
          depth: 0,
        },
      ],
      rule: {
        id: '98c0bf9e-4d38-46f4-9a6a-8a820426256b',
      },
      depth: 1,
    };
    const signal = buildAncestors(doc);
    const expected: Ancestor[] = [
      {
        id: '730ddf9e-5a00-4f85-9ddf-5878ca511a87',
        type: 'event',
        index: 'myFakeSignalIndex',
        depth: 0,
      },
      {
        rule: '98c0bf9e-4d38-46f4-9a6a-8a820426256b',
        id: 'd5e8eb51-a6a0-456d-8a15-4b79bfec3d71',
        type: 'signal',
        index: 'myFakeSignalIndex',
        depth: 1,
      },
    ];
    expect(signal).toEqual(expected);
  });
});
