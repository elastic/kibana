/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { PatchRulesOptions } from './types';
import { alertsClientMock } from '../../../../../alerts/server/mocks';
import { savedObjectsClientMock } from '../../../../../../../src/core/server/mocks';
import { INTERNAL_RULE_ID_KEY, INTERNAL_IMMUTABLE_KEY } from '../../../../common/constants';
import { SanitizedAlert } from '../../../../../alerts/common';

const rule: SanitizedAlert = {
  id: '04128c15-0d1b-4716-a4c5-46997ac7f3bd',
  name: 'Detect Root/Admin Users',
  tags: [`${INTERNAL_RULE_ID_KEY}:rule-1`, `${INTERNAL_IMMUTABLE_KEY}:false`],
  alertTypeId: 'siem.signals',
  consumer: 'siem',
  params: {
    anomalyThreshold: undefined,
    description: 'Detecting root and admin users',
    ruleId: 'rule-1',
    index: ['auditbeat-*', 'filebeat-*', 'packetbeat-*', 'winlogbeat-*'],
    falsePositives: [],
    from: 'now-6m',
    immutable: false,
    query: 'user.name: root or user.name: admin',
    language: 'kuery',
    machineLearningJobId: undefined,
    outputIndex: '.siem-signals',
    timelineId: 'some-timeline-id',
    timelineTitle: 'some-timeline-title',
    meta: { someMeta: 'someField' },
    filters: [
      {
        query: {
          match_phrase: {
            'host.name': 'some-host',
          },
        },
      },
    ],
    riskScore: 50,
    maxSignals: 100,
    severity: 'high',
    to: 'now',
    type: 'query',
    threat: [
      {
        framework: 'MITRE ATT&CK',
        tactic: {
          id: 'TA0040',
          name: 'impact',
          reference: 'https://attack.mitre.org/tactics/TA0040/',
        },
        technique: [
          {
            id: 'T1499',
            name: 'endpoint denial of service',
            reference: 'https://attack.mitre.org/techniques/T1499/',
          },
        ],
      },
    ],
    references: ['http://www.example.com', 'https://ww.example.com'],
    note: '# Investigative notes',
    version: 1,
    exceptionsList: [
      {
        field: 'source.ip',
        values_operator: 'included',
        values_type: 'exists',
      },
      {
        field: 'host.name',
        values_operator: 'excluded',
        values_type: 'match',
        values: [
          {
            name: 'rock01',
          },
        ],
        and: [
          {
            field: 'host.id',
            values_operator: 'included',
            values_type: 'match_all',
            values: [
              {
                name: '123',
              },
              {
                name: '678',
              },
            ],
          },
        ],
      },
    ],
  },
  createdAt: new Date('2019-12-13T16:40:33.400Z'),
  updatedAt: new Date('2019-12-13T16:40:33.400Z'),
  schedule: { interval: '5m' },
  enabled: true,
  actions: [],
  throttle: null,
  createdBy: 'elastic',
  updatedBy: 'elastic',
  apiKeyOwner: 'elastic',
  muteAll: false,
  mutedInstanceIds: [],
  scheduledTaskId: '2dabe330-0702-11ea-8b50-773b89126888',
};

export const getPatchRulesOptionsMock = (): PatchRulesOptions => ({
  author: ['Elastic'],
  buildingBlockType: undefined,
  alertsClient: alertsClientMock.create(),
  savedObjectsClient: savedObjectsClientMock.create(),
  anomalyThreshold: undefined,
  description: 'some description',
  enabled: true,
  falsePositives: ['false positive 1', 'false positive 2'],
  from: 'now-6m',
  query: 'user.name: root or user.name: admin',
  language: 'kuery',
  license: 'Elastic License',
  savedId: 'savedId-123',
  timelineId: 'timelineid-123',
  timelineTitle: 'timeline-title-123',
  meta: {},
  machineLearningJobId: undefined,
  filters: [],
  index: ['index-123'],
  interval: '5m',
  maxSignals: 100,
  riskScore: 80,
  riskScoreMapping: [],
  ruleNameOverride: undefined,
  outputIndex: 'output-1',
  name: 'Query with a rule id',
  severity: 'high',
  severityMapping: [],
  tags: [],
  threat: [],
  threshold: undefined,
  timestampOverride: undefined,
  to: 'now',
  type: 'query',
  references: ['http://www.example.com'],
  note: '# sample markdown',
  version: 1,
  exceptionsList: [],
  actions: [],
  rule,
});

export const getPatchMlRulesOptionsMock = (): PatchRulesOptions => ({
  author: ['Elastic'],
  buildingBlockType: undefined,
  alertsClient: alertsClientMock.create(),
  savedObjectsClient: savedObjectsClientMock.create(),
  anomalyThreshold: 55,
  description: 'some description',
  enabled: true,
  falsePositives: ['false positive 1', 'false positive 2'],
  from: 'now-6m',
  query: undefined,
  language: undefined,
  license: 'Elastic License',
  savedId: 'savedId-123',
  timelineId: 'timelineid-123',
  timelineTitle: 'timeline-title-123',
  meta: {},
  machineLearningJobId: 'new_job_id',
  filters: [],
  index: ['index-123'],
  interval: '5m',
  maxSignals: 100,
  riskScore: 80,
  riskScoreMapping: [],
  ruleNameOverride: undefined,
  outputIndex: 'output-1',
  name: 'Machine Learning Job',
  severity: 'high',
  severityMapping: [],
  tags: [],
  threat: [],
  threshold: undefined,
  timestampOverride: undefined,
  to: 'now',
  type: 'machine_learning',
  references: ['http://www.example.com'],
  note: '# sample markdown',
  version: 1,
  exceptionsList: [],
  actions: [],
  rule,
});
