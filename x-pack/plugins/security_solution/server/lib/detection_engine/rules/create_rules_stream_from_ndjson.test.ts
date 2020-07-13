/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { Readable } from 'stream';
import { createRulesStreamFromNdJson } from './create_rules_stream_from_ndjson';
import { createPromiseFromStreams } from 'src/legacy/utils/streams';
import { BadRequestError } from '../errors/bad_request_error';
import { ImportRulesSchemaDecoded } from '../../../../common/detection_engine/schemas/request/import_rules_schema';

type PromiseFromStreams = ImportRulesSchemaDecoded | Error;

export const getOutputSample = (): Partial<ImportRulesSchemaDecoded> => ({
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

export const getSampleAsNdjson = (sample: Partial<ImportRulesSchemaDecoded>): string => {
  return `${JSON.stringify(sample)}\n`;
};

describe('create_rules_stream_from_ndjson', () => {
  describe('createRulesStreamFromNdJson', () => {
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
      const rulesObjectsStream = createRulesStreamFromNdJson(1000);
      const result = await createPromiseFromStreams<PromiseFromStreams[]>([
        ndJsonStream,
        ...rulesObjectsStream,
      ]);
      expect(result).toEqual([
        {
          author: [],
          actions: [],
          rule_id: 'rule-1',
          output_index: '.siem-signals',
          risk_score: 50,
          risk_score_mapping: [],
          description: 'some description',
          from: 'now-5m',
          to: 'now',
          index: ['index-1'],
          name: 'some-name',
          severity: 'low',
          severity_mapping: [],
          interval: '5m',
          type: 'query',
          enabled: true,
          false_positives: [],
          immutable: false,
          exceptions_list: [],
          max_signals: 100,
          tags: [],
          threat: [],
          throttle: null,
          references: [],
          version: 1,
        },
        {
          author: [],
          actions: [],
          rule_id: 'rule-2',
          output_index: '.siem-signals',
          risk_score: 50,
          risk_score_mapping: [],
          description: 'some description',
          from: 'now-5m',
          to: 'now',
          index: ['index-1'],
          name: 'some-name',
          severity: 'low',
          severity_mapping: [],
          interval: '5m',
          type: 'query',
          enabled: true,
          false_positives: [],
          immutable: false,
          exceptions_list: [],
          max_signals: 100,
          tags: [],
          threat: [],
          throttle: null,
          references: [],
          version: 1,
        },
      ]);
    });

    test('returns error when ndjson stream is larger than limit', async () => {
      const sample1 = getOutputSample();
      const sample2 = getOutputSample();
      sample2.rule_id = 'rule-2';
      const ndJsonStream = new Readable({
        read() {
          this.push(getSampleAsNdjson(sample1));
          this.push(getSampleAsNdjson(sample2));
        },
      });
      const rulesObjectsStream = createRulesStreamFromNdJson(1);
      await expect(
        createPromiseFromStreams<PromiseFromStreams[]>([ndJsonStream, ...rulesObjectsStream])
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
      const rulesObjectsStream = createRulesStreamFromNdJson(1000);
      const result = await createPromiseFromStreams<PromiseFromStreams[]>([
        ndJsonStream,
        ...rulesObjectsStream,
      ]);
      expect(result).toEqual([
        {
          author: [],
          actions: [],
          rule_id: 'rule-1',
          output_index: '.siem-signals',
          risk_score: 50,
          risk_score_mapping: [],
          description: 'some description',
          from: 'now-5m',
          to: 'now',
          index: ['index-1'],
          name: 'some-name',
          severity: 'low',
          severity_mapping: [],
          interval: '5m',
          type: 'query',
          enabled: true,
          false_positives: [],
          immutable: false,
          max_signals: 100,
          tags: [],
          exceptions_list: [],
          threat: [],
          throttle: null,
          references: [],
          version: 1,
        },
        {
          author: [],
          actions: [],
          rule_id: 'rule-2',
          output_index: '.siem-signals',
          risk_score: 50,
          risk_score_mapping: [],
          description: 'some description',
          from: 'now-5m',
          to: 'now',
          index: ['index-1'],
          name: 'some-name',
          severity: 'low',
          severity_mapping: [],
          interval: '5m',
          type: 'query',
          enabled: true,
          false_positives: [],
          immutable: false,
          max_signals: 100,
          exceptions_list: [],
          tags: [],
          threat: [],
          throttle: null,
          references: [],
          version: 1,
        },
      ]);
    });

    test('filters the export details entry from the stream', async () => {
      const sample1 = getOutputSample();
      const sample2 = getOutputSample();
      sample2.rule_id = 'rule-2';
      const ndJsonStream = new Readable({
        read() {
          this.push(getSampleAsNdjson(sample1));
          this.push(getSampleAsNdjson(sample2));
          this.push('{"exported_count":1,"missing_rules":[],"missing_rules_count":0}\n');
          this.push(null);
        },
      });
      const rulesObjectsStream = createRulesStreamFromNdJson(1000);
      const result = await createPromiseFromStreams<PromiseFromStreams[]>([
        ndJsonStream,
        ...rulesObjectsStream,
      ]);
      expect(result).toEqual([
        {
          author: [],
          actions: [],
          rule_id: 'rule-1',
          output_index: '.siem-signals',
          risk_score: 50,
          risk_score_mapping: [],
          description: 'some description',
          from: 'now-5m',
          to: 'now',
          index: ['index-1'],
          name: 'some-name',
          severity: 'low',
          severity_mapping: [],
          interval: '5m',
          type: 'query',
          enabled: true,
          false_positives: [],
          immutable: false,
          max_signals: 100,
          exceptions_list: [],
          tags: [],
          threat: [],
          throttle: null,
          references: [],
          version: 1,
        },
        {
          author: [],
          actions: [],
          rule_id: 'rule-2',
          output_index: '.siem-signals',
          risk_score: 50,
          risk_score_mapping: [],
          description: 'some description',
          from: 'now-5m',
          to: 'now',
          index: ['index-1'],
          name: 'some-name',
          severity: 'low',
          severity_mapping: [],
          interval: '5m',
          type: 'query',
          enabled: true,
          false_positives: [],
          immutable: false,
          max_signals: 100,
          exceptions_list: [],
          tags: [],
          threat: [],
          throttle: null,
          references: [],
          version: 1,
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
      const rulesObjectsStream = createRulesStreamFromNdJson(1000);
      const result = await createPromiseFromStreams<PromiseFromStreams[]>([
        ndJsonStream,
        ...rulesObjectsStream,
      ]);
      const resultOrError = result as Error[];
      expect(resultOrError[0]).toEqual({
        author: [],
        actions: [],
        rule_id: 'rule-1',
        output_index: '.siem-signals',
        risk_score: 50,
        risk_score_mapping: [],
        description: 'some description',
        from: 'now-5m',
        to: 'now',
        index: ['index-1'],
        name: 'some-name',
        severity: 'low',
        severity_mapping: [],
        interval: '5m',
        type: 'query',
        enabled: true,
        false_positives: [],
        immutable: false,
        max_signals: 100,
        exceptions_list: [],
        tags: [],
        threat: [],
        throttle: null,
        references: [],
        version: 1,
      });
      expect(resultOrError[1].message).toEqual('Unexpected token , in JSON at position 1');
      expect(resultOrError[2]).toEqual({
        author: [],
        actions: [],
        rule_id: 'rule-2',
        output_index: '.siem-signals',
        risk_score: 50,
        risk_score_mapping: [],
        description: 'some description',
        from: 'now-5m',
        to: 'now',
        index: ['index-1'],
        name: 'some-name',
        severity: 'low',
        severity_mapping: [],
        interval: '5m',
        type: 'query',
        enabled: true,
        false_positives: [],
        immutable: false,
        max_signals: 100,
        exceptions_list: [],
        tags: [],
        threat: [],
        throttle: null,
        references: [],
        version: 1,
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
      const rulesObjectsStream = createRulesStreamFromNdJson(1000);
      const result = await createPromiseFromStreams<PromiseFromStreams[]>([
        ndJsonStream,
        ...rulesObjectsStream,
      ]);
      const resultOrError = result as BadRequestError[];
      expect(resultOrError[0]).toEqual({
        author: [],
        actions: [],
        rule_id: 'rule-1',
        output_index: '.siem-signals',
        risk_score: 50,
        risk_score_mapping: [],
        description: 'some description',
        from: 'now-5m',
        to: 'now',
        index: ['index-1'],
        name: 'some-name',
        severity: 'low',
        severity_mapping: [],
        interval: '5m',
        type: 'query',
        enabled: true,
        false_positives: [],
        immutable: false,
        max_signals: 100,
        exceptions_list: [],
        tags: [],
        threat: [],
        throttle: null,
        references: [],
        version: 1,
      });
      expect(resultOrError[1].message).toEqual(
        'Invalid value "undefined" supplied to "description",Invalid value "undefined" supplied to "risk_score",Invalid value "undefined" supplied to "name",Invalid value "undefined" supplied to "severity",Invalid value "undefined" supplied to "type",Invalid value "undefined" supplied to "rule_id"'
      );
      expect(resultOrError[2]).toEqual({
        author: [],
        actions: [],
        rule_id: 'rule-2',
        output_index: '.siem-signals',
        risk_score: 50,
        risk_score_mapping: [],
        description: 'some description',
        from: 'now-5m',
        to: 'now',
        index: ['index-1'],
        name: 'some-name',
        severity: 'low',
        severity_mapping: [],
        interval: '5m',
        type: 'query',
        enabled: true,
        false_positives: [],
        immutable: false,
        max_signals: 100,
        exceptions_list: [],
        tags: [],
        threat: [],
        throttle: null,
        references: [],
        version: 1,
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
      const rulesObjectsStream = createRulesStreamFromNdJson(1000);
      const result = await createPromiseFromStreams<PromiseFromStreams[]>([
        ndJsonStream,
        ...rulesObjectsStream,
      ]);
      const resultOrError = result as BadRequestError[];
      expect(resultOrError[1] instanceof BadRequestError).toEqual(true);
    });
  });
});
