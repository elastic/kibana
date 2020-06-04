/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Readable } from 'stream';

import { OutputRuleAlertRest } from '../../types';
import { HapiReadableStream } from '../../rules/types';

/**
 * This is a typical simple rule for testing that is easy for most basic testing
 * @param ruleId
 */
export const getSimpleRule = (ruleId = 'rule-1'): Partial<OutputRuleAlertRest> => ({
  name: 'Simple Rule Query',
  description: 'Simple Rule Query',
  risk_score: 1,
  rule_id: ruleId,
  severity: 'high',
  type: 'query',
  query: 'user.name: root or user.name: admin',
});

/**
 * This is a typical ML rule for testing
 * @param ruleId
 */
export const getSimpleMlRule = (ruleId = 'rule-1'): Partial<OutputRuleAlertRest> => ({
  name: 'Simple Rule Query',
  description: 'Simple Rule Query',
  risk_score: 1,
  rule_id: ruleId,
  severity: 'high',
  type: 'machine_learning',
  anomaly_threshold: 44,
  machine_learning_job_id: 'some_job_id',
});

/**
 * This is a typical simple rule for testing that is easy for most basic testing
 * @param ruleId
 */
export const getSimpleRuleWithId = (id = 'rule-1'): Partial<OutputRuleAlertRest> => ({
  name: 'Simple Rule Query',
  description: 'Simple Rule Query',
  risk_score: 1,
  id,
  severity: 'high',
  type: 'query',
  query: 'user.name: root or user.name: admin',
});

/**
 * Given an array of rules, builds an NDJSON string of rules
 * as we might import/export
 * @param rules Array of rule objects with which to generate rule JSON
 */
export const rulesToNdJsonString = (rules: Array<Partial<OutputRuleAlertRest>>) => {
  return rules.map((rule) => JSON.stringify(rule)).join('\r\n');
};

/**
 * Given an array of rule IDs, builds an NDJSON string of rules
 * as we might import/export
 * @param ruleIds Array of ruleIds with which to generate rule JSON
 */
export const ruleIdsToNdJsonString = (ruleIds: string[]) => {
  const rules = ruleIds.map((ruleId) => getSimpleRule(ruleId));
  return rulesToNdJsonString(rules);
};

/**
 * Given a string, builds a hapi stream as our
 * route handler would receive it.
 * @param string contents of the stream
 * @param filename String to declare file extension
 */
export const buildHapiStream = (string: string, filename = 'file.ndjson'): HapiReadableStream => {
  const HapiStream = class extends Readable {
    public readonly hapi: { filename: string };
    constructor(fileName: string) {
      super();
      this.hapi = { filename: fileName };
    }
  };

  const stream = new HapiStream(filename);
  stream.push(string);
  stream.push(null);

  return stream;
};

export const getOutputRuleAlertForRest = (): Omit<
  OutputRuleAlertRest,
  'machine_learning_job_id' | 'anomaly_threshold'
> => ({
  actions: [],
  created_by: 'elastic',
  created_at: '2019-12-13T16:40:33.400Z',
  updated_at: '2019-12-13T16:40:33.400Z',
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
  tags: [],
  throttle: 'no_actions',
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
  exceptions_list: [
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
  filters: [
    {
      query: {
        match_phrase: {
          'host.name': 'some-host',
        },
      },
    },
  ],
  meta: {
    someMeta: 'someField',
  },
  timeline_id: 'some-timeline-id',
  timeline_title: 'some-timeline-title',
  to: 'now',
  type: 'query',
  note: '# Investigative notes',
  version: 1,
});
