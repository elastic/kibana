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
  TIMESTAMP,
} from '@kbn/rule-data-utils';

import { sampleDocNoSortIdWithTimestamp } from '../../../signals/__mocks__/es_results';
import { flattenWithPrefix } from './flatten_with_prefix';
import { buildAlertGroupFromSequence } from './build_alert_group_from_sequence';
import { Ancestor, SignalSourceHit } from '../../../signals/types';
import {
  getRulesSchemaMock,
  ANCHOR_DATE,
} from '../../../../../../common/detection_engine/schemas/response/rules_schema.mocks';
import { getListArrayMock } from '../../../../../../common/detection_engine/schemas/types/lists.mock';
import {
  ALERT_ANCESTORS,
  ALERT_DEPTH,
  ALERT_ORIGINAL_EVENT,
  ALERT_ORIGINAL_TIME,
} from '../../field_maps/field_names';
import { SERVER_APP_ID } from '../../../../../../common/constants';

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
    const eqlSequence = {
      join_keys: [],
      events: [
        {
          _index: 'index',
          _id: '1',
          _source: {
            '@timestamp': '2020-10-04T15:16:54.368707900Z',
          },
        },
        {
          _index: 'index',
          _id: '2',
          _source: {
            '@timestamp': '2020-10-04T15:50:54.368707900Z',
          },
        },
      ],
    };
    const alertGroup = buildAlertGroupFromSequence(eqlSequence, rule, 'allFields', SPACE_ID);
    /*
    const timestamp = alert[TIMESTAMP];
    const expected = {
      [TIMESTAMP]: timestamp,
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
      [ALERT_DEPTH]: 1,
    };
    expect(alert).toEqual(expected);
    */
  });
});
