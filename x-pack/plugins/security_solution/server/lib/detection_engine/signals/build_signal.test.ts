/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { sampleDocNoSortId } from './__mocks__/es_results';
import { buildSignal, buildParent, buildAncestors, additionalSignalFields } from './build_signal';
import { Signal, Ancestor } from './types';
import {
  getRulesSchemaMock,
  ANCHOR_DATE,
} from '../../../../common/detection_engine/schemas/response/rules_schema.mocks';
import { getListArrayMock } from '../../../../common/detection_engine/schemas/types/lists.mock';

describe('buildSignal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('it builds a signal as expected without original_event if event does not exist', () => {
    const doc = sampleDocNoSortId('d5e8eb51-a6a0-456d-8a15-4b79bfec3d71');
    delete doc._source.event;
    const rule = getRulesSchemaMock();
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
        author: [],
        id: '7a7065d7-6e8b-4aae-8d20-c93613dec9f9',
        created_at: new Date(ANCHOR_DATE).toISOString(),
        updated_at: new Date(ANCHOR_DATE).toISOString(),
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
        status: 'succeeded',
        status_date: '2020-02-22T16:47:50.047Z',
        last_success_at: '2020-02-22T16:47:50.047Z',
        last_success_message: 'succeeded',
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
    const rule = getRulesSchemaMock();
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
        author: [],
        id: '7a7065d7-6e8b-4aae-8d20-c93613dec9f9',
        created_at: new Date(ANCHOR_DATE).toISOString(),
        updated_at: new Date(ANCHOR_DATE).toISOString(),
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
        status: 'succeeded',
        status_date: '2020-02-22T16:47:50.047Z',
        last_success_at: '2020-02-22T16:47:50.047Z',
        last_success_message: 'succeeded',
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
