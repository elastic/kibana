/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ALERT_INSTANCE_ID,
  ALERT_REASON,
  ALERT_RULE_CONSUMER,
  ALERT_RULE_NAMESPACE,
  ALERT_RULE_UUID,
  ALERT_STATUS,
  ALERT_STATUS_ACTIVE,
  ALERT_UUID,
  ALERT_WORKFLOW_STATUS,
  EVENT_ACTION,
  EVENT_KIND,
  EVENT_MODULE,
  SPACE_IDS,
  TIMESTAMP,
} from '@kbn/rule-data-utils';
import { flattenWithPrefix } from '@kbn/securitysolution-rules';

import { sampleDocNoSortIdWithTimestamp } from '../../../signals/__mocks__/es_results';
import { buildAlert, buildParent, buildAncestors, additionalAlertFields } from './build_alert';
import { Ancestor, SignalSourceHit } from '../../../signals/types';
import {
  getRulesSchemaMock,
  ANCHOR_DATE,
} from '../../../../../../common/detection_engine/schemas/response/rules_schema.mocks';
import { getListArrayMock } from '../../../../../../common/detection_engine/schemas/types/lists.mock';
import { SERVER_APP_ID } from '../../../../../../common/constants';
import { EVENT_DATASET } from '../../../../../../common/cti/constants';
import {
  ALERT_ANCESTORS,
  ALERT_ORIGINAL_TIME,
  ALERT_DEPTH,
  ALERT_ORIGINAL_EVENT,
} from '../../../../../../common/field_maps/field_names';

type SignalDoc = SignalSourceHit & {
  _source: Required<SignalSourceHit>['_source'] & { [TIMESTAMP]: string };
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
    const reason = 'alert reasonable reason';
    const alert = {
      ...buildAlert([doc], rule, SPACE_ID, reason),
      ...additionalAlertFields(doc),
    };
    const timestamp = alert[TIMESTAMP];
    const expected = {
      [TIMESTAMP]: timestamp,
      [SPACE_IDS]: [SPACE_ID],
      [ALERT_RULE_CONSUMER]: SERVER_APP_ID,
      [ALERT_ANCESTORS]: [
        {
          id: 'd5e8eb51-a6a0-456d-8a15-4b79bfec3d71',
          type: 'event',
          index: 'myFakeSignalIndex',
          depth: 0,
        },
      ],
      [ALERT_ORIGINAL_TIME]: '2020-04-20T21:27:45.000Z',
      [ALERT_REASON]: 'alert reasonable reason',
      [ALERT_STATUS]: ALERT_STATUS_ACTIVE,
      [ALERT_WORKFLOW_STATUS]: 'open',
      ...flattenWithPrefix(ALERT_RULE_NAMESPACE, {
        author: [],
        uuid: '7a7065d7-6e8b-4aae-8d20-c93613dec9f9',
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
        max_signals: 100,
        risk_score: 55,
        risk_score_mapping: [],
        language: 'kuery',
        rule_id: 'query-rule-id',
        interval: '5m',
        exceptions_list: getListArrayMock(),
      }),
      [ALERT_DEPTH]: 1,
    };
    expect(alert).toEqual(expected);
  });

  test('it builds an alert as expected with original_event if present', () => {
    const sampleDoc = sampleDocNoSortIdWithTimestamp('d5e8eb51-a6a0-456d-8a15-4b79bfec3d71');
    const doc = {
      ...sampleDoc,
      _source: {
        ...sampleDoc._source,
        [EVENT_ACTION]: 'socket_opened',
        [EVENT_DATASET]: 'socket',
        [EVENT_KIND]: 'event',
        [EVENT_MODULE]: 'system',
      },
    };
    const rule = getRulesSchemaMock();
    const reason = 'alert reasonable reason';
    const alert = {
      ...buildAlert([doc], rule, SPACE_ID, reason),
      ...additionalAlertFields(doc),
    };
    const timestamp = alert[TIMESTAMP];
    const expected = {
      [TIMESTAMP]: timestamp,
      [SPACE_IDS]: [SPACE_ID],
      [ALERT_RULE_CONSUMER]: SERVER_APP_ID,
      [ALERT_ANCESTORS]: [
        {
          id: 'd5e8eb51-a6a0-456d-8a15-4b79bfec3d71',
          type: 'event',
          index: 'myFakeSignalIndex',
          depth: 0,
        },
      ],
      [ALERT_ORIGINAL_TIME]: '2020-04-20T21:27:45.000Z',
      ...flattenWithPrefix(ALERT_ORIGINAL_EVENT, {
        action: 'socket_opened',
        dataset: 'socket',
        kind: 'event',
        module: 'system',
      }),
      [ALERT_REASON]: 'alert reasonable reason',
      [ALERT_STATUS]: ALERT_STATUS_ACTIVE,
      [ALERT_WORKFLOW_STATUS]: 'open',
      ...flattenWithPrefix(ALERT_RULE_NAMESPACE, {
        author: [],
        uuid: '7a7065d7-6e8b-4aae-8d20-c93613dec9f9',
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
        max_signals: 100,
        risk_score: 55,
        risk_score_mapping: [],
        language: 'kuery',
        rule_id: 'query-rule-id',
        interval: '5m',
        exceptions_list: getListArrayMock(),
      }),
      [ALERT_DEPTH]: 1,
    };
    expect(alert).toEqual(expected);
  });

  test('it builds a parent correctly if the parent does not exist', () => {
    const sampleDoc = sampleDocNoSortIdWithTimestamp('d5e8eb51-a6a0-456d-8a15-4b79bfec3d71');
    const doc = {
      ...sampleDoc,
      _source: {
        ...sampleDoc._source,
        [EVENT_ACTION]: 'socket_opened',
        [EVENT_DATASET]: 'socket',
        [EVENT_KIND]: 'event',
        [EVENT_MODULE]: 'system',
      },
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

  test('it builds a parent correctly if the parent does exist', () => {
    const docId = 'd5e8eb51-a6a0-456d-8a15-4b79bfec3d71';
    const sampleDoc = sampleDocNoSortIdWithTimestamp(docId);
    const doc = {
      ...sampleDoc,
      _source: {
        ...sampleDoc._source,
        [ALERT_INSTANCE_ID]: '',
        [ALERT_UUID]: docId,
        [EVENT_ACTION]: 'socket_opened',
        [EVENT_DATASET]: 'socket',
        [EVENT_KIND]: 'signal',
        [EVENT_MODULE]: 'system',
        [ALERT_DEPTH]: 1,
        [ALERT_RULE_UUID]: '98c0bf9e-4d38-46f4-9a6a-8a820426256b',
        [ALERT_ANCESTORS]: [
          {
            id: '730ddf9e-5a00-4f85-9ddf-5878ca511a87',
            type: 'event',
            index: 'myFakeSignalIndex',
            depth: 0,
          },
        ],
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

  test('it builds an ancestor correctly if the parent does not exist', () => {
    const sampleDoc = sampleDocNoSortIdWithTimestamp('d5e8eb51-a6a0-456d-8a15-4b79bfec3d71');
    const doc: SignalDoc = {
      ...sampleDoc,
      _source: {
        ...sampleDoc._source,
        [TIMESTAMP]: new Date().toISOString(),
        [EVENT_ACTION]: 'socket_opened',
        [EVENT_DATASET]: 'socket',
        [EVENT_KIND]: 'event',
        [EVENT_MODULE]: 'system',
      },
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

  test('it builds an ancestor correctly if the parent does exist', () => {
    const docId = 'd5e8eb51-a6a0-456d-8a15-4b79bfec3d71';
    const sampleDoc = sampleDocNoSortIdWithTimestamp(docId);
    const doc = {
      ...sampleDoc,
      _source: {
        ...sampleDoc._source,
        [TIMESTAMP]: new Date().toISOString(),
        [ALERT_UUID]: docId,
        [EVENT_ACTION]: 'socket_opened',
        [EVENT_DATASET]: 'socket',
        [EVENT_KIND]: 'signal',
        [EVENT_MODULE]: 'system',
        [ALERT_RULE_UUID]: '98c0bf9e-4d38-46f4-9a6a-8a820426256b',
        [ALERT_DEPTH]: 1,
        [ALERT_ANCESTORS]: [
          {
            id: '730ddf9e-5a00-4f85-9ddf-5878ca511a87',
            type: 'event',
            index: 'myFakeSignalIndex',
            depth: 0,
          },
        ],
      },
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
});
