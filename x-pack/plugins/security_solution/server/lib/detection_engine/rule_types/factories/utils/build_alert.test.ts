/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ALERT_OWNER,
  ALERT_RULE_NAMESPACE,
  ALERT_STATUS,
  ALERT_WORKFLOW_STATUS,
  SPACE_IDS,
} from '@kbn/rule-data-utils';

import { sampleDocNoSortIdWithTimestamp } from '../../../signals/__mocks__/es_results';
import { flattenWithPrefix } from './flatten_with_prefix';
import {
  buildAlert,
  buildParent,
  buildAncestors,
  additionalAlertFields,
  removeClashes,
} from './build_alert';
import { Ancestor, SignalSourceHit } from '../../../signals/types';
import {
  getRulesSchemaMock,
  ANCHOR_DATE,
} from '../../../../../../common/detection_engine/schemas/response/rules_schema.mocks';
import { getListArrayMock } from '../../../../../../common/detection_engine/schemas/types/lists.mock';
import {
  ALERT_ANCESTORS,
  ALERT_ORIGINAL_EVENT,
  ALERT_ORIGINAL_TIME,
} from '../../field_maps/field_names';
import { SERVER_APP_ID } from '../../../../../../common/constants';

type SignalDoc = SignalSourceHit & {
  _source: Required<SignalSourceHit>['_source'] & { '@timestamp': string };
};

const SPACE_ID = 'space';

describe('buildAlert', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('it builds an alert as expected without original_event if event does not exist', () => {
    const doc = sampleDocNoSortIdWithTimestamp('d5e8eb51-a6a0-456d-8a15-4b79bfec3d71');
    delete doc._source.event;
    const rule = getRulesSchemaMock();
    const alert = {
      ...buildAlert([doc], rule, SPACE_ID),
      ...additionalAlertFields(doc),
    };
    const timestamp = alert['@timestamp'];
    const expected = {
      '@timestamp': timestamp,
      [SPACE_IDS]: [SPACE_ID],
      [ALERT_OWNER]: SERVER_APP_ID,
      [ALERT_ANCESTORS]: [
        {
          id: 'd5e8eb51-a6a0-456d-8a15-4b79bfec3d71',
          type: 'event',
          index: 'myFakeSignalIndex',
          depth: 0,
        },
      ],
      [ALERT_ORIGINAL_TIME]: '2020-04-20T21:27:45.000Z',
      [ALERT_STATUS]: 'open',
      [ALERT_WORKFLOW_STATUS]: 'open',
      ...flattenWithPrefix(ALERT_RULE_NAMESPACE, {
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
      }),
      'kibana.alert.depth': 1,
    };
    expect(alert).toEqual(expected);
  });

  test('it builds an alert as expected with original_event if is present', () => {
    const doc = sampleDocNoSortIdWithTimestamp('d5e8eb51-a6a0-456d-8a15-4b79bfec3d71');
    doc._source.event = {
      action: 'socket_opened',
      dataset: 'socket',
      kind: 'event',
      module: 'system',
    };
    const rule = getRulesSchemaMock();
    const alert = {
      ...buildAlert([doc], rule, SPACE_ID),
      ...additionalAlertFields(doc),
    };
    const timestamp = alert['@timestamp'];
    const expected = {
      '@timestamp': timestamp,
      [SPACE_IDS]: [SPACE_ID],
      [ALERT_OWNER]: SERVER_APP_ID,
      [ALERT_ANCESTORS]: [
        {
          id: 'd5e8eb51-a6a0-456d-8a15-4b79bfec3d71',
          type: 'event',
          index: 'myFakeSignalIndex',
          depth: 0,
        },
      ],
      [ALERT_ORIGINAL_TIME]: '2020-04-20T21:27:45.000Z',
      [ALERT_ORIGINAL_EVENT]: {
        action: 'socket_opened',
        dataset: 'socket',
        kind: 'event',
        module: 'system',
      },
      [ALERT_STATUS]: 'open',
      [ALERT_WORKFLOW_STATUS]: 'open',
      ...flattenWithPrefix(ALERT_RULE_NAMESPACE, {
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
      }),
      'kibana.alert.depth': 1,
    };
    expect(alert).toEqual(expected);
  });

  test('it builds an ancestor correctly if the parent does not exist', () => {
    const doc = sampleDocNoSortIdWithTimestamp('d5e8eb51-a6a0-456d-8a15-4b79bfec3d71');
    doc._source.event = {
      action: 'socket_opened',
      dataset: 'socket',
      kind: 'event',
      module: 'system',
    };
    const parent = buildParent(doc);
    const expected: Ancestor = {
      id: 'd5e8eb51-a6a0-456d-8a15-4b79bfec3d71',
      type: 'event',
      index: 'myFakeSignalIndex',
      depth: 0,
    };
    expect(parent).toEqual(expected);
  });

  test('it builds an ancestor correctly if the parent does exist', () => {
    const doc = sampleDocNoSortIdWithTimestamp('d5e8eb51-a6a0-456d-8a15-4b79bfec3d71');
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
    const parent = buildParent(doc);
    const expected: Ancestor = {
      rule: '98c0bf9e-4d38-46f4-9a6a-8a820426256b',
      id: 'd5e8eb51-a6a0-456d-8a15-4b79bfec3d71',
      type: 'signal',
      index: 'myFakeSignalIndex',
      depth: 1,
    };
    expect(parent).toEqual(expected);
  });

  test('it builds an alert ancestor correctly if the parent does not exist', () => {
    const sampleDoc = sampleDocNoSortIdWithTimestamp('d5e8eb51-a6a0-456d-8a15-4b79bfec3d71');
    const doc: SignalDoc = {
      ...sampleDoc,
      _source: {
        ...sampleDoc._source,
        '@timestamp': new Date().toISOString(),
      },
    };
    doc._source.event = {
      action: 'socket_opened',
      dataset: 'socket',
      kind: 'event',
      module: 'system',
    };
    const ancestor = buildAncestors(doc);
    const expected: Ancestor[] = [
      {
        id: 'd5e8eb51-a6a0-456d-8a15-4b79bfec3d71',
        type: 'event',
        index: 'myFakeSignalIndex',
        depth: 0,
      },
    ];
    expect(ancestor).toEqual(expected);
  });

  test('it builds an alert ancestor correctly if the parent does exist', () => {
    const sampleDoc = sampleDocNoSortIdWithTimestamp('d5e8eb51-a6a0-456d-8a15-4b79bfec3d71');
    const doc: SignalDoc = {
      ...sampleDoc,
      _source: {
        ...sampleDoc._source,
        '@timestamp': new Date().toISOString(),
      },
    };
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
    const ancestors = buildAncestors(doc);
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
    expect(ancestors).toEqual(expected);
  });

  describe('removeClashes', () => {
    test('it will call renameClashes with a regular doc and not mutate it if it does not have a signal clash', () => {
      const sampleDoc = sampleDocNoSortIdWithTimestamp('d5e8eb51-a6a0-456d-8a15-4b79bfec3d71');
      const doc: SignalDoc = {
        ...sampleDoc,
        _source: {
          ...sampleDoc._source,
          '@timestamp': new Date().toISOString(),
        },
      };
      const output = removeClashes(doc);
      expect(output).toBe(doc); // reference check
    });

    test('it will call renameClashes with a regular doc and not change anything', () => {
      const sampleDoc = sampleDocNoSortIdWithTimestamp('d5e8eb51-a6a0-456d-8a15-4b79bfec3d71');
      const doc: SignalDoc = {
        ...sampleDoc,
        _source: {
          ...sampleDoc._source,
          '@timestamp': new Date().toISOString(),
        },
      };
      const output = removeClashes(doc);
      expect(output).toEqual(doc); // deep equal check
    });

    test('it will remove a "signal" numeric clash', () => {
      const sampleDoc = sampleDocNoSortIdWithTimestamp('d5e8eb51-a6a0-456d-8a15-4b79bfec3d71');
      const doc = ({
        ...sampleDoc,
        _source: {
          ...sampleDoc._source,
          signal: 127,
        },
      } as unknown) as SignalDoc;
      const output = removeClashes(doc);
      const timestamp = output._source['@timestamp'];
      expect(output).toEqual({
        ...sampleDoc,
        _source: {
          ...sampleDoc._source,
          '@timestamp': timestamp,
        },
      });
    });

    test('it will remove a "signal" object clash', () => {
      const sampleDoc = sampleDocNoSortIdWithTimestamp('d5e8eb51-a6a0-456d-8a15-4b79bfec3d71');
      const doc = ({
        ...sampleDoc,
        _source: {
          ...sampleDoc._source,
          signal: { child_1: { child_2: 'Test nesting' } },
        },
      } as unknown) as SignalDoc;
      const output = removeClashes(doc);
      const timestamp = output._source['@timestamp'];
      expect(output).toEqual({
        ...sampleDoc,
        _source: {
          ...sampleDoc._source,
          '@timestamp': timestamp,
        },
      });
    });

    test('it will not remove a "signal" if that is signal is one of our signals', () => {
      const sampleDoc = sampleDocNoSortIdWithTimestamp('d5e8eb51-a6a0-456d-8a15-4b79bfec3d71');
      const doc = ({
        ...sampleDoc,
        _source: {
          ...sampleDoc._source,
          signal: { rule: { id: '123' } },
        },
      } as unknown) as SignalDoc;
      const output = removeClashes(doc);
      const timestamp = output._source['@timestamp'];
      const expected = {
        ...sampleDoc,
        _source: {
          ...sampleDoc._source,
          signal: { rule: { id: '123' } },
          '@timestamp': timestamp,
        },
      };
      expect(output).toEqual(expected);
    });
  });
});
