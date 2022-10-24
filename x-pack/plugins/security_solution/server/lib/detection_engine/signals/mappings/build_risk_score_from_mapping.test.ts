/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RiskScore, RiskScoreMapping } from '@kbn/securitysolution-io-ts-alerting-types';
import { sampleDocRiskScore } from '../__mocks__/es_results';
import type { BuildRiskScoreFromMappingReturn } from './build_risk_score_from_mapping';
import { buildRiskScoreFromMapping } from './build_risk_score_from_mapping';

describe('buildRiskScoreFromMapping', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('base cases: when mapping is undefined', () => {
    test('returns the provided default score', () => {
      testIt({
        fieldValue: 42,
        scoreDefault: 57,
        scoreMapping: undefined,
        expected: scoreOf(57),
      });
    });
  });

  describe('base cases: when mapping to a field of type number', () => {
    test(`returns that number if it's integer and within the range [0;100]`, () => {
      testIt({
        fieldValue: 42,
        scoreDefault: 57,
        scoreMapping: mappingToSingleField(),
        expected: overriddenScoreOf(42),
      });
    });

    test(`returns that number if it's float and within the range [0;100]`, () => {
      testIt({
        fieldValue: 3.14,
        scoreDefault: 57,
        scoreMapping: mappingToSingleField(),
        expected: overriddenScoreOf(3.14),
      });
    });

    test(`returns default score if the number is < 0`, () => {
      testIt({
        fieldValue: -0.0000000000001,
        scoreDefault: 57,
        scoreMapping: mappingToSingleField(),
        expected: scoreOf(57),
      });
    });

    test(`returns default score if the number is > 100`, () => {
      testIt({
        fieldValue: 100.0000000000001,
        scoreDefault: 57,
        scoreMapping: mappingToSingleField(),
        expected: scoreOf(57),
      });
    });
  });

  describe('base cases: when mapping to a field of type string', () => {
    test(`returns the number casted from string if it's integer and within the range [0;100]`, () => {
      testIt({
        fieldValue: '42',
        scoreDefault: 57,
        scoreMapping: mappingToSingleField(),
        expected: overriddenScoreOf(42),
      });
    });

    test(`returns the number casted from string if it's float and within the range [0;100]`, () => {
      testIt({
        fieldValue: '3.14',
        scoreDefault: 57,
        scoreMapping: mappingToSingleField(),
        expected: overriddenScoreOf(3.14),
      });
    });

    test(`returns default score if the "number" is < 0`, () => {
      testIt({
        fieldValue: '-1',
        scoreDefault: 57,
        scoreMapping: mappingToSingleField(),
        expected: scoreOf(57),
      });
    });

    test(`returns default score if the "number" is > 100`, () => {
      testIt({
        fieldValue: '101',
        scoreDefault: 57,
        scoreMapping: mappingToSingleField(),
        expected: scoreOf(57),
      });
    });
  });

  describe('base cases: when mapping to an array of numbers or strings', () => {
    test(`returns that number if it's a single element and it's within the range [0;100]`, () => {
      testIt({
        fieldValue: [3.14],
        scoreDefault: 57,
        scoreMapping: mappingToSingleField(),
        expected: overriddenScoreOf(3.14),
      });
    });

    test(`returns the max number of those that are within the range [0;100]`, () => {
      testIt({
        fieldValue: [42, -42, 17, 87, 87.5, '86.5', 110, 66],
        scoreDefault: 57,
        scoreMapping: mappingToSingleField(),
        expected: overriddenScoreOf(87.5),
      });
    });

    test(`supports casting strings to numbers`, () => {
      testIt({
        fieldValue: [-1, 1, '3', '1.5', '3.14', 2],
        scoreDefault: 57,
        scoreMapping: mappingToSingleField(),
        expected: overriddenScoreOf(3.14),
      });
    });
  });

  describe('edge cases: when mapping to a single junk value', () => {
    describe('ignores it and returns the default score', () => {
      const cases = [
        undefined,
        null,
        NaN,
        Infinity,
        -Infinity,
        Number.MAX_VALUE,
        -Number.MAX_VALUE,
        -Number.MIN_VALUE,
        'string',
        [],
        {},
        new Date(),
      ];

      test.each(cases)('%p', (value) => {
        testIt({
          fieldValue: value,
          scoreDefault: 57,
          scoreMapping: mappingToSingleField(),
          expected: scoreOf(57),
        });
      });
    });
  });

  describe('edge cases: when mapping to an array of junk values', () => {
    describe('ignores junk, extracts valid numbers and returns the max number within the range [0;100]', () => {
      type Case = [unknown[], number];
      const cases: Case[] = [
        [[undefined, null, 1.5, 1, -Infinity], 1.5],
        [['42', NaN, '44', '43', 42, {}], 44],
        [[Infinity, '101', 100, 99, Number.MIN_VALUE], 100],
        [[Number.MIN_VALUE, -0], Number.MIN_VALUE],
      ];

      test.each(cases)('%p', (value, expectedScore) => {
        testIt({
          fieldValue: value,
          scoreDefault: 57,
          scoreMapping: mappingToSingleField(),
          expected: overriddenScoreOf(expectedScore),
        });
      });
    });
  });
});

interface TestCase {
  fieldValue: unknown;
  scoreDefault: RiskScore;
  scoreMapping: RiskScoreMapping | undefined;
  expected: BuildRiskScoreFromMappingReturn;
}

function testIt({ fieldValue, scoreDefault, scoreMapping, expected }: TestCase) {
  const result = buildRiskScoreFromMapping({
    // @ts-expect-error @elastic/elasticsearch _source is optional
    eventSource: sampleDocRiskScore(fieldValue)._source,
    riskScore: scoreDefault,
    riskScoreMapping: scoreMapping,
  });

  expect(result).toEqual(expected);
}

function mappingToSingleField() {
  return [{ field: 'event.risk', operator: 'equals' as const, value: '', risk_score: undefined }];
}

function scoreOf(value: number) {
  return {
    riskScore: value,
    riskScoreMeta: {},
  };
}

function overriddenScoreOf(value: number) {
  return {
    riskScore: value,
    riskScoreMeta: { riskScoreOverridden: true },
  };
}
