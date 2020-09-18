/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Readable } from 'stream';

import { HapiReadableStream } from '../../rules/types';
import { RulesSchema } from '../../../../../common/detection_engine/schemas/response/rules_schema';
import { getListArrayMock } from '../../../../../common/detection_engine/schemas/types/lists.mock';

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
  RulesSchema,
  'machine_learning_job_id' | 'anomaly_threshold'
> => ({
  author: ['Elastic'],
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
  risk_score_mapping: [],
  rule_id: 'rule-1',
  language: 'kuery',
  license: 'Elastic License',
  max_signals: 100,
  name: 'Detect Root/Admin Users',
  output_index: '.siem-signals',
  query: 'user.name: root or user.name: admin',
  references: ['http://www.example.com', 'https://ww.example.com'],
  severity: 'high',
  severity_mapping: [],
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
  exceptions_list: getListArrayMock(),
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
