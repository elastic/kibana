/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  SPACE_IDS,
  ALERT_RULE_CONSUMER,
  ALERT_REASON,
  ALERT_STATUS,
  ALERT_STATUS_ACTIVE,
  ALERT_WORKFLOW_STATUS,
  ALERT_RULE_NAMESPACE,
  ALERT_UUID,
  ALERT_RULE_TYPE_ID,
  ALERT_RULE_PRODUCER,
  ALERT_RULE_CATEGORY,
  ALERT_RULE_UUID,
  ALERT_RULE_NAME,
  ALERT_INSTANCE_ID,
  ALERT_RULE_PARAMETERS,
} from '@kbn/rule-data-utils';
import { flattenWithPrefix } from '@kbn/securitysolution-rules';

import type { TypeOfFieldMap } from '@kbn/rule-registry-plugin/common/field_map';
import { SERVER_APP_ID } from '../../../../../common/constants';
import { ANCHOR_DATE } from '../../../../../common/detection_engine/rule_schema/mocks';
import { getListArrayMock } from '../../../../../common/detection_engine/schemas/types/lists.mock';
import type { RulesFieldMap } from '../../../../../common/field_maps';
import {
  ALERT_ANCESTORS,
  ALERT_ORIGINAL_TIME,
  ALERT_ORIGINAL_EVENT,
  ALERT_THRESHOLD_RESULT,
} from '../../../../../common/field_maps/field_names';

export const sampleThresholdAlert = {
  _id: 'b3ad77a4-65bd-4c4e-89cf-13c46f54bc4d',
  _index: 'some-index',
  _source: {
    '@timestamp': '2020-04-20T21:26:30.000Z',
    [SPACE_IDS]: ['default'],
    [ALERT_UUID]: '310158f7-994d-4a38-8cdc-152139ac4d29',
    [ALERT_INSTANCE_ID]: '',
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
    [ALERT_ORIGINAL_EVENT]: {
      action: 'socket_opened',
      dataset: 'socket',
      kind: 'event',
      module: 'system',
    },
    [ALERT_REASON]: 'alert reasonable reason',
    [ALERT_STATUS]: ALERT_STATUS_ACTIVE,
    [ALERT_WORKFLOW_STATUS]: 'open',
    'source.ip': '127.0.0.1',
    'host.name': 'garden-gnomes',
    [ALERT_RULE_CATEGORY]: 'security',
    [ALERT_RULE_NAME]: 'a threshold rule',
    [ALERT_RULE_PRODUCER]: 'siem',
    [ALERT_RULE_TYPE_ID]: 'query-rule-id',
    [ALERT_RULE_UUID]: '151af49f-2e82-4b6f-831b-7f8cb341a5ff',
    [ALERT_THRESHOLD_RESULT]: {
      count: 3,
    },
    [ALERT_RULE_PARAMETERS]: {
      author: [],
      description: 'some description',
      false_positives: ['false positive 1', 'false positive 2'],
      from: 'now-6m',
      immutable: false,
      query: 'user.name: root or user.name: admin',
      references: ['test 1', 'test 2'],
      severity: 'high',
      severity_mapping: [],
      to: 'now',
      type: 'query',
      threat: [],
      threshold: {
        field: ['source.ip', 'host.name'],
        value: 1,
      },
      max_signals: 100,
      risk_score: 55,
      risk_score_mapping: [],
      language: 'kuery',
      rule_id: 'f88a544c-1d4e-4652-ae2a-c953b38da5d0',
      exceptions_list: getListArrayMock(),
    },
    ...(flattenWithPrefix(ALERT_RULE_NAMESPACE, {
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
      updated_by: 'elastic_kibana',
      tags: ['some fake tag 1', 'some fake tag 2'],
      to: 'now',
      type: 'threshold',
      threat: [],
      version: 1,
      max_signals: 100,
      language: 'kuery',
      rule_id: 'f88a544c-1d4e-4652-ae2a-c953b38da5d0',
      interval: '5m',
      exceptions_list: getListArrayMock(),
    }) as TypeOfFieldMap<RulesFieldMap>),
    'kibana.alert.depth': 1,
  },
};
