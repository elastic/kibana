/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ALERT_INSTANCE_ID,
  ALERT_NAMESPACE,
  ALERT_RULE_UUID,
  ALERT_UUID,
  EVENT_ACTION,
  EVENT_KIND,
  EVENT_MODULE,
  TIMESTAMP,
} from '@kbn/rule-data-utils';
import { flattenWithPrefix } from '@kbn/securitysolution-rules';

import { sampleDocNoSortIdWithTimestamp } from '../../__mocks__/es_results';
import { buildAlertFields, buildParent, buildAncestors } from './build_alert';
import type { Ancestor, SignalSourceHit } from '../../types';
import { EVENT_DATASET } from '../../../../../../common/cti/constants';
import { ALERT_ANCESTORS, ALERT_DEPTH } from '../../../../../../common/field_maps/field_names';
import { getCompleteRuleMock, getQueryRuleParams } from '../../../rule_schema/mocks';

type SignalDoc = SignalSourceHit & {
  _id: Required<SignalSourceHit>['_id'];
  _source: Required<SignalSourceHit>['_source'] & { [TIMESTAMP]: string };
};

describe('buildAlertFields', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('it creates the expected alert fields', () => {
    const sampleDoc = sampleDocNoSortIdWithTimestamp('d5e8eb51-a6a0-456d-8a15-4b79bfec3d71');
    const completeRule = getCompleteRuleMock(getQueryRuleParams());
    const alertFields = buildAlertFields({
      docs: [sampleDoc],
      completeRule,
      spaceId: 'default',
      reason: 'test reason',
      indicesToQuery: [],
      alertUuid: 'test-uuid',
      publicBaseUrl: 'test/url',
      alertTimestampOverride: new Date('2020-01-01T00:00:00.000Z'),
    });
    expect(alertFields).toMatchSnapshot();
  });

  test('it builds a parent correctly if the parent does not exist', () => {
    const sampleDoc = sampleDocNoSortIdWithTimestamp('d5e8eb51-a6a0-456d-8a15-4b79bfec3d71');
    const parent = buildParent(sampleDoc);
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

  test('it builds an ancestor correctly if the parent is an alert', () => {
    const docId = 'd5e8eb51-a6a0-456d-8a15-4b79bfec3d71';
    const sampleDoc = sampleDocNoSortIdWithTimestamp(docId);
    const doc = {
      ...sampleDoc,
      _source: {
        ...sampleDoc._source,
        [TIMESTAMP]: new Date().toISOString(),
        [EVENT_ACTION]: 'socket_opened',
        [EVENT_KIND]: 'signal',
        [EVENT_DATASET]: 'socket',
        [EVENT_MODULE]: 'system',
        [ALERT_UUID]: docId,
        ...flattenWithPrefix(ALERT_NAMESPACE, {
          depth: 1,
          ancestors: [
            {
              id: '730ddf9e-5a00-4f85-9ddf-5878ca511a87',
              type: 'event',
              index: 'myFakeSignalIndex',
              depth: 0,
            },
          ],
          rule: {
            uuid: '98c0bf9e-4d38-46f4-9a6a-8a820426256b',
          },
        }),
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

  test('it builds an ancestor correctly if the parent is a legacy alert', () => {
    const docId = 'd5e8eb51-a6a0-456d-8a15-4b79bfec3d71';
    const sampleDoc = sampleDocNoSortIdWithTimestamp(docId);
    const doc = {
      ...sampleDoc,
      _source: {
        ...sampleDoc._source,
        [TIMESTAMP]: new Date().toISOString(),
        event: {
          action: 'socket_opened',
          dataset: 'socket',
          kind: 'signal',
          module: 'system',
        },
        signal: {
          depth: 1,
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
        },
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
