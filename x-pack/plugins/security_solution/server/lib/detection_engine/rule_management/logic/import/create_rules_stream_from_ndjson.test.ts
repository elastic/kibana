/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Readable } from 'stream';
import { createPromiseFromStreams } from '@kbn/utils';
import { createRulesAndExceptionsStreamFromNdJson } from './create_rules_stream_from_ndjson';
import { BadRequestError } from '@kbn/securitysolution-es-utils';

import type { RuleToImport } from '../../../../../../common/api/detection_engine/rule_management';
import {
  getOutputDetailsSample,
  getSampleDetailsAsNdjson,
} from '../../../../../../common/api/detection_engine/rule_management/mocks';
import type { RuleExceptionsPromiseFromStreams } from './import_rules_utils';
import type { InvestigationFields } from '../../../../../../common/api/detection_engine';

export const getOutputSample = (): Partial<RuleToImport> => ({
  rule_id: 'rule-1',
  output_index: '.siem-signals',
  risk_score: 50,
  description: 'some description',
  from: 'now-5m',
  to: 'now',
  index: ['index-1'],
  name: 'some-name',
  severity: 'low',
  interval: '5m',
  type: 'query',
});

export const getSampleAsNdjson = (sample: Partial<RuleToImport>): string => {
  return `${JSON.stringify(sample)}\n`;
};

describe('create_rules_stream_from_ndjson', () => {
  describe('createRulesAndExceptionsStreamFromNdJson', () => {
    test('transforms an ndjson stream into a stream of rule objects', async () => {
      const sample1 = getOutputSample();
      const sample2 = getOutputSample();
      sample2.rule_id = 'rule-2';
      const ndJsonStream = new Readable({
        read() {
          this.push(getSampleAsNdjson(sample1));
          this.push(getSampleAsNdjson(sample2));
          this.push(null);
        },
      });
      const rulesObjectsStream = createRulesAndExceptionsStreamFromNdJson(1000);
      const [{ rules: result }] = await createPromiseFromStreams<
        RuleExceptionsPromiseFromStreams[]
      >([ndJsonStream, ...rulesObjectsStream]);
      expect(result).toEqual([
        {
          rule_id: 'rule-1',
          output_index: '.siem-signals',
          risk_score: 50,
          description: 'some description',
          from: 'now-5m',
          to: 'now',
          index: ['index-1'],
          name: 'some-name',
          severity: 'low',
          interval: '5m',
          type: 'query',
          immutable: false,
        },
        {
          rule_id: 'rule-2',
          output_index: '.siem-signals',
          risk_score: 50,
          description: 'some description',
          from: 'now-5m',
          to: 'now',
          index: ['index-1'],
          name: 'some-name',
          severity: 'low',
          interval: '5m',
          type: 'query',
          immutable: false,
        },
      ]);
    });

    // TODO - Yara - there's a integration test testing this, but causing timeoutes here
    test.skip('returns error when ndjson stream is larger than limit', async () => {
      const sample1 = getOutputSample();
      const sample2 = getOutputSample();
      sample2.rule_id = 'rule-2';
      const ndJsonStream = new Readable({
        read() {
          this.push(getSampleAsNdjson(sample1));
          this.push(getSampleAsNdjson(sample2));
        },
      });
      const rulesObjectsStream = createRulesAndExceptionsStreamFromNdJson(2);
      await expect(
        createPromiseFromStreams<RuleExceptionsPromiseFromStreams[]>([
          ndJsonStream,
          ...rulesObjectsStream,
        ])
      ).rejects.toThrowError("Can't import more than 1 rules");
    });

    test('skips empty lines', async () => {
      const sample1 = getOutputSample();
      const sample2 = getOutputSample();
      sample2.rule_id = 'rule-2';
      const ndJsonStream = new Readable({
        read() {
          this.push(getSampleAsNdjson(sample1));
          this.push('\n');
          this.push(getSampleAsNdjson(sample2));
          this.push('');
          this.push(null);
        },
      });
      const rulesObjectsStream = createRulesAndExceptionsStreamFromNdJson(1000);
      const [{ rules: result }] = await createPromiseFromStreams<
        RuleExceptionsPromiseFromStreams[]
      >([ndJsonStream, ...rulesObjectsStream]);
      expect(result).toEqual([
        {
          rule_id: 'rule-1',
          output_index: '.siem-signals',
          risk_score: 50,
          description: 'some description',
          from: 'now-5m',
          to: 'now',
          index: ['index-1'],
          name: 'some-name',
          severity: 'low',
          interval: '5m',
          type: 'query',
          immutable: false,
        },
        {
          rule_id: 'rule-2',
          output_index: '.siem-signals',
          risk_score: 50,
          description: 'some description',
          from: 'now-5m',
          to: 'now',
          index: ['index-1'],
          name: 'some-name',
          severity: 'low',
          interval: '5m',
          type: 'query',
          immutable: false,
        },
      ]);
    });

    test('filters the export details entry from the stream', async () => {
      const sample1 = getOutputSample();
      const sample2 = getOutputSample();
      const details = getOutputDetailsSample({ totalCount: 1, rulesCount: 1 });
      sample2.rule_id = 'rule-2';
      const ndJsonStream = new Readable({
        read() {
          this.push(getSampleAsNdjson(sample1));
          this.push(getSampleAsNdjson(sample2));
          this.push(getSampleDetailsAsNdjson(details));
          this.push(null);
        },
      });
      const rulesObjectsStream = createRulesAndExceptionsStreamFromNdJson(1000);
      const [{ rules: result }] = await createPromiseFromStreams<
        RuleExceptionsPromiseFromStreams[]
      >([ndJsonStream, ...rulesObjectsStream]);
      expect(result).toEqual([
        {
          rule_id: 'rule-1',
          output_index: '.siem-signals',
          risk_score: 50,
          description: 'some description',
          from: 'now-5m',
          to: 'now',
          index: ['index-1'],
          name: 'some-name',
          severity: 'low',
          interval: '5m',
          type: 'query',
          immutable: false,
        },
        {
          rule_id: 'rule-2',
          output_index: '.siem-signals',
          risk_score: 50,
          description: 'some description',
          from: 'now-5m',
          to: 'now',
          index: ['index-1'],
          name: 'some-name',
          severity: 'low',
          interval: '5m',
          type: 'query',
          immutable: false,
        },
      ]);
    });

    test('handles non parsable JSON strings and inserts the error as part of the return array', async () => {
      const sample1 = getOutputSample();
      const sample2 = getOutputSample();
      sample2.rule_id = 'rule-2';
      const ndJsonStream = new Readable({
        read() {
          this.push(getSampleAsNdjson(sample1));
          this.push('{,,,,\n');
          this.push(getSampleAsNdjson(sample2));
          this.push(null);
        },
      });
      const rulesObjectsStream = createRulesAndExceptionsStreamFromNdJson(1000);
      const [{ rules: result }] = await createPromiseFromStreams<
        RuleExceptionsPromiseFromStreams[]
      >([ndJsonStream, ...rulesObjectsStream]);
      const resultOrError = result as Error[];
      expect(resultOrError[0]).toEqual({
        rule_id: 'rule-1',
        output_index: '.siem-signals',
        risk_score: 50,
        description: 'some description',
        from: 'now-5m',
        to: 'now',
        index: ['index-1'],
        name: 'some-name',
        severity: 'low',
        interval: '5m',
        type: 'query',
        immutable: false,
      });
      expect(resultOrError[1].message).toEqual(
        `Expected property name or '}' in JSON at position 1`
      );
      expect(resultOrError[2]).toEqual({
        rule_id: 'rule-2',
        output_index: '.siem-signals',
        risk_score: 50,
        description: 'some description',
        from: 'now-5m',
        to: 'now',
        index: ['index-1'],
        name: 'some-name',
        severity: 'low',
        interval: '5m',
        type: 'query',
        immutable: false,
      });
    });

    test('handles non-validated data', async () => {
      const sample1 = getOutputSample();
      const sample2 = getOutputSample();
      sample2.rule_id = 'rule-2';
      const ndJsonStream = new Readable({
        read() {
          this.push(getSampleAsNdjson(sample1));
          this.push(`{}\n`);
          this.push(getSampleAsNdjson(sample2));
          this.push(null);
        },
      });
      const rulesObjectsStream = createRulesAndExceptionsStreamFromNdJson(1000);
      const [{ rules: result }] = await createPromiseFromStreams<
        RuleExceptionsPromiseFromStreams[]
      >([ndJsonStream, ...rulesObjectsStream]);
      const resultOrError = result as BadRequestError[];
      expect(resultOrError[0]).toEqual({
        rule_id: 'rule-1',
        output_index: '.siem-signals',
        risk_score: 50,
        description: 'some description',
        from: 'now-5m',
        to: 'now',
        index: ['index-1'],
        name: 'some-name',
        severity: 'low',
        interval: '5m',
        type: 'query',
        immutable: false,
      });
      expect(resultOrError[1].message).toContain(
        `name: Required, description: Required, risk_score: Required, severity: Required, type: Invalid discriminator value. Expected 'eql' | 'query' | 'saved_query' | 'threshold' | 'threat_match' | 'machine_learning' | 'new_terms' | 'esql', and 1 more`
      );
      expect(resultOrError[2]).toEqual({
        rule_id: 'rule-2',
        output_index: '.siem-signals',
        risk_score: 50,
        description: 'some description',
        from: 'now-5m',
        to: 'now',
        index: ['index-1'],
        name: 'some-name',
        severity: 'low',
        interval: '5m',
        type: 'query',
        immutable: false,
      });
    });

    test('non validated data is an instanceof BadRequestError', async () => {
      const sample1 = getOutputSample();
      const sample2 = getOutputSample();
      sample2.rule_id = 'rule-2';
      const ndJsonStream = new Readable({
        read() {
          this.push(getSampleAsNdjson(sample1));
          this.push(`{}\n`);
          this.push(getSampleAsNdjson(sample2));
          this.push(null);
        },
      });
      const rulesObjectsStream = createRulesAndExceptionsStreamFromNdJson(1000);
      const [{ rules: result }] = await createPromiseFromStreams<
        RuleExceptionsPromiseFromStreams[]
      >([ndJsonStream, ...rulesObjectsStream]);
      const resultOrError = result as BadRequestError[];
      expect(resultOrError[1] instanceof BadRequestError).toEqual(true);
    });

    test('migrates investigation_fields', async () => {
      const sample1 = {
        ...getOutputSample(),
        investigation_fields: ['foo', 'bar'] as unknown as InvestigationFields,
      };
      const sample2 = {
        ...getOutputSample(),
        rule_id: 'rule-2',
        investigation_fields: [] as unknown as InvestigationFields,
      };
      sample2.rule_id = 'rule-2';
      const ndJsonStream = new Readable({
        read() {
          this.push(getSampleAsNdjson(sample1));
          this.push(getSampleAsNdjson(sample2));
          this.push(null);
        },
      });
      const rulesObjectsStream = createRulesAndExceptionsStreamFromNdJson(1000);
      const [{ rules: result }] = await createPromiseFromStreams<
        RuleExceptionsPromiseFromStreams[]
      >([ndJsonStream, ...rulesObjectsStream]);
      expect(result).toEqual([
        {
          rule_id: 'rule-1',
          output_index: '.siem-signals',
          risk_score: 50,
          description: 'some description',
          from: 'now-5m',
          to: 'now',
          index: ['index-1'],
          name: 'some-name',
          severity: 'low',
          interval: '5m',
          type: 'query',
          immutable: false,
          investigation_fields: {
            field_names: ['foo', 'bar'],
          },
        },
        {
          rule_id: 'rule-2',
          output_index: '.siem-signals',
          risk_score: 50,
          description: 'some description',
          from: 'now-5m',
          to: 'now',
          index: ['index-1'],
          name: 'some-name',
          severity: 'low',
          interval: '5m',
          type: 'query',
          immutable: false,
        },
      ]);
    });
  });
});
