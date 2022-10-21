/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ALERT_INSTANCE_ID,
  ALERT_NAMESPACE,
  ALERT_REASON,
  ALERT_RISK_SCORE,
  ALERT_RULE_CONSUMER,
  ALERT_RULE_NAMESPACE,
  ALERT_RULE_PARAMETERS,
  ALERT_RULE_UUID,
  ALERT_SEVERITY,
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
import type { Ancestor, SignalSourceHit } from '../../../signals/types';
import { getListArrayMock } from '../../../../../../common/detection_engine/schemas/types/lists.mock';
import { SERVER_APP_ID } from '../../../../../../common/constants';
import { EVENT_DATASET } from '../../../../../../common/cti/constants';
import {
  ALERT_ANCESTORS,
  ALERT_ORIGINAL_TIME,
  ALERT_DEPTH,
  ALERT_ORIGINAL_EVENT,
  ALERT_BUILDING_BLOCK_TYPE,
  ALERT_RULE_INDICES,
} from '../../../../../../common/field_maps/field_names';
import { getCompleteRuleMock, getQueryRuleParams } from '../../../rule_schema/mocks';

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
    const completeRule = getCompleteRuleMock(getQueryRuleParams());
    const reason = 'alert reasonable reason';
    const alert = {
      ...buildAlert(
        [doc],
        completeRule,
        SPACE_ID,
        reason,
        completeRule.ruleParams.index as string[]
      ),
      ...additionalAlertFields(doc),
    };
    const timestamp = alert[TIMESTAMP];
    const expected = {
      [TIMESTAMP]: timestamp,
      [EVENT_KIND]: 'signal',
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
      [ALERT_BUILDING_BLOCK_TYPE]: 'default',
      [ALERT_SEVERITY]: 'high',
      [ALERT_RISK_SCORE]: 50,
      [ALERT_RULE_PARAMETERS]: {
        description: 'Detecting root and admin users',
        risk_score: 50,
        severity: 'high',
        building_block_type: 'default',
        note: '# Investigative notes',
        license: 'Elastic License',
        timeline_id: 'some-timeline-id',
        timeline_title: 'some-timeline-title',
        meta: { someMeta: 'someField' },
        author: ['Elastic'],
        false_positives: [],
        from: 'now-6m',
        rule_id: 'rule-1',
        max_signals: 10000,
        risk_score_mapping: [],
        severity_mapping: [],
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
        to: 'now',
        references: ['http://example.com', 'https://example.com'],
        related_integrations: [],
        required_fields: [],
        setup: '',
        version: 1,
        exceptions_list: [
          {
            id: 'some_uuid',
            list_id: 'list_id_single',
            namespace_type: 'single',
            type: 'detection',
          },
          {
            id: 'endpoint_list',
            list_id: 'endpoint_list',
            namespace_type: 'agnostic',
            type: 'endpoint',
          },
        ],
        immutable: false,
        type: 'query',
        language: 'kuery',
        index: ['auditbeat-*', 'filebeat-*', 'packetbeat-*', 'winlogbeat-*'],
        query: 'user.name: root or user.name: admin',
        filters: [{ query: { match_phrase: { 'host.name': 'some-host' } } }],
      },
      [ALERT_RULE_INDICES]: completeRule.ruleParams.index,
      ...flattenWithPrefix(ALERT_RULE_NAMESPACE, {
        actions: [],
        author: ['Elastic'],
        uuid: '04128c15-0d1b-4716-a4c5-46997ac7f3bd',
        building_block_type: 'default',
        created_at: '2020-03-27T22:55:59.577Z',
        updated_at: '2020-03-27T22:55:59.577Z',
        created_by: 'sample user',
        description: 'Detecting root and admin users',
        enabled: true,
        false_positives: [],
        from: 'now-6m',
        immutable: false,
        license: 'Elastic License',
        meta: {
          someMeta: 'someField',
        },
        name: 'rule-name',
        note: '# Investigative notes',
        references: ['http://example.com', 'https://example.com'],
        severity: 'high',
        severity_mapping: [],
        updated_by: 'sample user',
        tags: ['some fake tag 1', 'some fake tag 2'],
        to: 'now',
        type: 'query',
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
        version: 1,
        max_signals: 10000,
        risk_score: 50,
        risk_score_mapping: [],
        rule_id: 'rule-1',
        interval: '5m',
        exceptions_list: getListArrayMock(),
        throttle: 'no_actions',
        timeline_id: 'some-timeline-id',
        timeline_title: 'some-timeline-title',
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
    const completeRule = getCompleteRuleMock(getQueryRuleParams());
    const reason = 'alert reasonable reason';
    const alert = {
      ...buildAlert(
        [doc],
        completeRule,
        SPACE_ID,
        reason,
        completeRule.ruleParams.index as string[]
      ),
      ...additionalAlertFields(doc),
    };
    const timestamp = alert[TIMESTAMP];

    const expected = {
      [TIMESTAMP]: timestamp,
      [EVENT_KIND]: 'signal',
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
      [ALERT_RULE_INDICES]: completeRule.ruleParams.index,
      ...flattenWithPrefix(ALERT_ORIGINAL_EVENT, {
        action: 'socket_opened',
        dataset: 'socket',
        kind: 'event',
        module: 'system',
      }),
      [ALERT_REASON]: 'alert reasonable reason',
      [ALERT_STATUS]: ALERT_STATUS_ACTIVE,
      [ALERT_WORKFLOW_STATUS]: 'open',
      [ALERT_BUILDING_BLOCK_TYPE]: 'default',
      [ALERT_SEVERITY]: 'high',
      [ALERT_RISK_SCORE]: 50,
      [ALERT_RULE_PARAMETERS]: {
        description: 'Detecting root and admin users',
        risk_score: 50,
        severity: 'high',
        building_block_type: 'default',
        note: '# Investigative notes',
        license: 'Elastic License',
        timeline_id: 'some-timeline-id',
        timeline_title: 'some-timeline-title',
        meta: { someMeta: 'someField' },
        author: ['Elastic'],
        false_positives: [],
        from: 'now-6m',
        rule_id: 'rule-1',
        max_signals: 10000,
        risk_score_mapping: [],
        severity_mapping: [],
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
        to: 'now',
        references: ['http://example.com', 'https://example.com'],
        related_integrations: [],
        required_fields: [],
        setup: '',
        version: 1,
        exceptions_list: [
          {
            id: 'some_uuid',
            list_id: 'list_id_single',
            namespace_type: 'single',
            type: 'detection',
          },
          {
            id: 'endpoint_list',
            list_id: 'endpoint_list',
            namespace_type: 'agnostic',
            type: 'endpoint',
          },
        ],
        immutable: false,
        type: 'query',
        language: 'kuery',
        index: ['auditbeat-*', 'filebeat-*', 'packetbeat-*', 'winlogbeat-*'],
        query: 'user.name: root or user.name: admin',
        filters: [{ query: { match_phrase: { 'host.name': 'some-host' } } }],
      },
      ...flattenWithPrefix(ALERT_RULE_NAMESPACE, {
        actions: [],
        author: ['Elastic'],
        uuid: '04128c15-0d1b-4716-a4c5-46997ac7f3bd',
        building_block_type: 'default',
        created_at: '2020-03-27T22:55:59.577Z',
        updated_at: '2020-03-27T22:55:59.577Z',
        created_by: 'sample user',
        description: 'Detecting root and admin users',
        enabled: true,
        false_positives: [],
        from: 'now-6m',
        immutable: false,
        license: 'Elastic License',
        meta: {
          someMeta: 'someField',
        },
        name: 'rule-name',
        note: '# Investigative notes',
        references: ['http://example.com', 'https://example.com'],
        severity: 'high',
        severity_mapping: [],
        updated_by: 'sample user',
        tags: ['some fake tag 1', 'some fake tag 2'],
        to: 'now',
        type: 'query',
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
        version: 1,
        max_signals: 10000,
        risk_score: 50,
        risk_score_mapping: [],
        rule_id: 'rule-1',
        interval: '5m',
        exceptions_list: getListArrayMock(),
        throttle: 'no_actions',
        timeline_id: 'some-timeline-id',
        timeline_title: 'some-timeline-title',
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
