/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  ALERT_INTENDED_TIMESTAMP,
  ALERT_REASON,
  ALERT_RISK_SCORE,
  ALERT_RULE_CONSUMER,
  ALERT_RULE_EXECUTION_TYPE,
  ALERT_RULE_NAMESPACE,
  ALERT_RULE_PARAMETERS,
  ALERT_SEVERITY,
  ALERT_STATUS,
  ALERT_STATUS_ACTIVE,
  ALERT_URL,
  ALERT_UUID,
  ALERT_WORKFLOW_ASSIGNEE_IDS,
  ALERT_WORKFLOW_STATUS,
  ALERT_WORKFLOW_TAGS,
  EVENT_ACTION,
  EVENT_KIND,
  EVENT_MODULE,
  SPACE_IDS,
  TIMESTAMP,
} from '@kbn/rule-data-utils';
import { flattenWithPrefix } from '@kbn/securitysolution-rules';

import {
  sampleDocNoSortIdWithTimestamp,
  sampleDocWithNonEcsCompliantFields,
} from '../../__mocks__/es_results';
import { getListArrayMock } from '../../../../../../common/detection_engine/schemas/types/lists.mock';
import { DEFAULT_ALERTS_INDEX, SERVER_APP_ID } from '../../../../../../common/constants';
import { EVENT_DATASET } from '../../../../../../common/cti/constants';
import {
  ALERT_ANCESTORS,
  ALERT_ORIGINAL_TIME,
  ALERT_DEPTH,
  ALERT_ORIGINAL_EVENT,
  ALERT_BUILDING_BLOCK_TYPE,
  ALERT_RULE_INDICES,
} from '../../../../../../common/field_maps/field_names';

import { transformHitToAlert } from './transform_hit_to_alert';
import {
  getCompleteRuleMock,
  getEsqlRuleParams,
  getQueryRuleParams,
} from '../../../rule_schema/mocks';
import { ruleExecutionLogMock } from '../../../rule_monitoring/mocks';
import { get } from 'lodash';

const SPACE_ID = 'space';
const publicBaseUrl = 'testKibanaBasePath.com';
const alertUuid = 'test-uuid';
const docId = 'd5e8eb51-a6a0-456d-8a15-4b79bfec3d71';
const ruleExecutionLogger = ruleExecutionLogMock.forExecutors.create();
const buildReasonMessageStub = jest.fn();

describe('transformHitToAlert', () => {
  it('should strip non-ECS compliant sub-fields of `event.action` field', () => {
    const doc = sampleDocWithNonEcsCompliantFields(docId, {
      'event.action': 'process',
      'event.action.keyword': 'process',
    });
    const completeRule = getCompleteRuleMock(getEsqlRuleParams());

    const alert = transformHitToAlert({
      spaceId: SPACE_ID,
      completeRule,
      doc,
      mergeStrategy: 'missingFields',
      ignoreFields: {},
      ignoreFieldsRegexes: [],
      applyOverrides: true,
      buildReasonMessage: buildReasonMessageStub,
      indicesToQuery: [],
      alertTimestampOverride: undefined,
      ruleExecutionLogger,
      alertUuid,
      publicBaseUrl,
      intendedTimestamp: undefined,
    });

    expect(alert['kibana.alert.original_event.action']).toEqual('process');
    expect(alert['kibana.alert.original_event.action.keyword']).toBeUndefined();
  });

  it('should unset an existing event.kind field in nested notation', () => {
    const doc = {
      _index: 'testindex',
      _id: 'myId',
      _source: {
        event: {
          kind: 'test-value',
        },
      },
    };
    const completeRule = getCompleteRuleMock(getEsqlRuleParams());

    const alert = transformHitToAlert({
      spaceId: SPACE_ID,
      completeRule,
      doc,
      mergeStrategy: 'missingFields',
      ignoreFields: {},
      ignoreFieldsRegexes: [],
      applyOverrides: true,
      buildReasonMessage: buildReasonMessageStub,
      indicesToQuery: [],
      alertTimestampOverride: undefined,
      ruleExecutionLogger,
      alertUuid,
      publicBaseUrl,
      intendedTimestamp: undefined,
    });

    expect(get(alert.event, 'kind')).toEqual(undefined);
    expect(alert['event.kind']).toEqual('signal');
  });

  it('should replace an existing event.kind in dot notation', () => {
    const doc = {
      _index: 'testindex',
      _id: 'myId',
      _source: {
        'event.kind': 'test-value',
      },
    };
    const completeRule = getCompleteRuleMock(getEsqlRuleParams());

    const alert = transformHitToAlert({
      spaceId: SPACE_ID,
      completeRule,
      doc,
      mergeStrategy: 'missingFields',
      ignoreFields: {},
      ignoreFieldsRegexes: [],
      applyOverrides: true,
      buildReasonMessage: buildReasonMessageStub,
      indicesToQuery: [],
      alertTimestampOverride: undefined,
      ruleExecutionLogger,
      alertUuid,
      publicBaseUrl,
      intendedTimestamp: undefined,
    });

    expect(get(alert.event, 'kind')).toEqual(undefined);
    expect(alert['event.kind']).toEqual('signal');
  });

  it('should not add an empty event object if event.kind does not exist', () => {
    const doc = {
      _index: 'testindex',
      _id: 'myId',
      _source: {
        testField: 'testValue',
      },
    };
    const completeRule = getCompleteRuleMock(getEsqlRuleParams());

    const alert = transformHitToAlert({
      spaceId: SPACE_ID,
      completeRule,
      doc,
      mergeStrategy: 'missingFields',
      ignoreFields: {},
      ignoreFieldsRegexes: [],
      applyOverrides: true,
      buildReasonMessage: buildReasonMessageStub,
      indicesToQuery: [],
      alertTimestampOverride: undefined,
      ruleExecutionLogger,
      alertUuid,
      publicBaseUrl,
      intendedTimestamp: undefined,
    });

    expect(alert.event).toEqual(undefined);
    expect(alert['event.kind']).toEqual('signal');
  });

  it('should only copy ECS compatible array elements from event subfields to kibana.alert.original_event', () => {
    const doc = {
      _index: 'testindex',
      _id: 'myId',
      _source: {
        'event.action': ['process', { objectSubfield: 'test' }],
      },
    };
    const completeRule = getCompleteRuleMock(getEsqlRuleParams());

    const alert = transformHitToAlert({
      spaceId: SPACE_ID,
      completeRule,
      doc,
      mergeStrategy: 'missingFields',
      ignoreFields: {},
      ignoreFieldsRegexes: [],
      applyOverrides: true,
      buildReasonMessage: buildReasonMessageStub,
      indicesToQuery: [],
      alertTimestampOverride: undefined,
      ruleExecutionLogger,
      alertUuid,
      publicBaseUrl,
      intendedTimestamp: undefined,
    });

    expect(alert['kibana.alert.original_event.action']).toEqual(['process']);
  });

  it('builds an alert as expected without original_event if event does not exist', () => {
    const doc = sampleDocNoSortIdWithTimestamp('d5e8eb51-a6a0-456d-8a15-4b79bfec3d71');
    const completeRule = getCompleteRuleMock(getQueryRuleParams());
    const alert = transformHitToAlert({
      spaceId: SPACE_ID,
      completeRule,
      doc,
      mergeStrategy: 'missingFields',
      ignoreFields: {},
      ignoreFieldsRegexes: [],
      applyOverrides: true,
      buildReasonMessage: buildReasonMessageStub,
      indicesToQuery: ['auditbeat-*', 'filebeat-*', 'packetbeat-*', 'winlogbeat-*'],
      alertTimestampOverride: undefined,
      ruleExecutionLogger,
      alertUuid,
      publicBaseUrl,
      intendedTimestamp: undefined,
    });
    delete doc._source.event;

    const timestamp = alert[TIMESTAMP];
    const expectedAlertUrl = `${publicBaseUrl}/s/${SPACE_ID}/app/security/alerts/redirect/${alertUuid}?index=${DEFAULT_ALERTS_INDEX}-${SPACE_ID}&timestamp=${timestamp}`;
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
      [ALERT_REASON]: undefined,
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
        rule_source: {
          type: 'internal',
        },
        type: 'query',
        language: 'kuery',
        index: ['auditbeat-*', 'filebeat-*', 'packetbeat-*', 'winlogbeat-*'],
        query: 'user.name: root or user.name: admin',
        filters: [{ query: { match_phrase: { 'host.name': 'some-host' } } }],
        investigation_fields: undefined,
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
      [ALERT_URL]: expectedAlertUrl,
      [ALERT_UUID]: alertUuid,
      [ALERT_WORKFLOW_TAGS]: [],
      [ALERT_WORKFLOW_ASSIGNEE_IDS]: [],
      someKey: 'someValue',
      source: {
        ip: '127.0.0.1',
      },
      [ALERT_RULE_EXECUTION_TYPE]: 'scheduled',
      [ALERT_INTENDED_TIMESTAMP]: timestamp,
    };
    expect(alert).toEqual(expected);
  });

  it('builds an alert as expected with original_event if present', () => {
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
    const alert = transformHitToAlert({
      spaceId: SPACE_ID,
      completeRule,
      doc,
      mergeStrategy: 'missingFields',
      ignoreFields: {},
      ignoreFieldsRegexes: [],
      applyOverrides: true,
      buildReasonMessage: buildReasonMessageStub,
      indicesToQuery: [],
      alertTimestampOverride: undefined,
      ruleExecutionLogger,
      alertUuid,
      publicBaseUrl,
      intendedTimestamp: undefined,
    });
    const expected = {
      ...alert,
      ...flattenWithPrefix(ALERT_ORIGINAL_EVENT, {
        action: 'socket_opened',
        dataset: 'socket',
        kind: 'event',
        module: 'system',
      }),
    };
    expect(alert).toEqual(expected);
  });

  it('build alert with manual execution type if intendedTimestamp is provided', () => {
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
    const alert = transformHitToAlert({
      spaceId: SPACE_ID,
      completeRule,
      doc,
      mergeStrategy: 'missingFields',
      ignoreFields: {},
      ignoreFieldsRegexes: [],
      applyOverrides: true,
      buildReasonMessage: buildReasonMessageStub,
      indicesToQuery: [],
      alertTimestampOverride: undefined,
      ruleExecutionLogger,
      alertUuid,
      publicBaseUrl,
      intendedTimestamp: new Date('2019-01-01T00:00:00.000Z'),
    });
    const expected = {
      ...alert,
      [ALERT_RULE_EXECUTION_TYPE]: 'manual',
      [ALERT_INTENDED_TIMESTAMP]: new Date('2019-01-01T00:00:00.000Z').toISOString(),
    };
    expect(alert).toEqual(expected);
  });
});
