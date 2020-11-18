/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  RiskScore,
  RiskScoreMappingOrUndefined,
} from '../../../../../common/detection_engine/schemas/common/schemas';
import { sampleDocRiskScore } from '../__mocks__/es_results';
import {
  buildRiskScoreFromMapping,
  BuildRiskScoreFromMappingReturn,
} from './build_risk_score_from_mapping';

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
    test(`returns that number if it's within the range [0;100]`, () => {
      testIt({
        fieldValue: 42,
        scoreDefault: 57,
        scoreMapping: mappingToSingleField(),
        expected: overridenScoreOf(42),
      });
    });

    test(`returns default score if the number is < 0`, () => {
      testIt({
        fieldValue: -1,
        scoreDefault: 57,
        scoreMapping: mappingToSingleField(),
        expected: scoreOf(57),
      });
    });

    test(`returns default score if the number is > 100`, () => {
      testIt({
        fieldValue: 101,
        scoreDefault: 57,
        scoreMapping: mappingToSingleField(),
        expected: scoreOf(57),
      });
    });

    test(`returns default score if the number is not integer`, () => {
      testIt({
        fieldValue: 42.5,
        scoreDefault: 57,
        scoreMapping: mappingToSingleField(),
        expected: scoreOf(57),
      });
    });
  });

  describe('base cases: when mapping to a field of type string', () => {
    test(`returns the number casted from string if it's within the range [0;100]`, () => {
      testIt({
        fieldValue: '42',
        scoreDefault: 57,
        scoreMapping: mappingToSingleField(),
        expected: overridenScoreOf(42),
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

    test(`returns default score if the "number" is not integer`, () => {
      testIt({
        fieldValue: '42.5',
        scoreDefault: 57,
        scoreMapping: mappingToSingleField(),
        expected: scoreOf(57),
      });
    });
  });

  describe('base cases: when mapping to an array of numbers or strings', () => {
    test(`returns that number if it's a single element and it's within the range [0;100]`, () => {
      testIt({
        fieldValue: [42],
        scoreDefault: 57,
        scoreMapping: mappingToSingleField(),
        expected: overridenScoreOf(42),
      });
    });

    test(`returns the max integer number of those that are within the range [0;100]`, () => {
      testIt({
        fieldValue: [42, -42, 17, 87, 87.5, '88.5', 110, 66],
        scoreDefault: 57,
        scoreMapping: mappingToSingleField(),
        expected: overridenScoreOf(87),
      });
    });

    test(`supports casting integers from string to number`, () => {
      testIt({
        fieldValue: [-1, 1, '3', '1.5', 2],
        scoreDefault: 57,
        scoreMapping: mappingToSingleField(),
        expected: overridenScoreOf(3),
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
        Number.MIN_VALUE,
        Number.MAX_VALUE,
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
        [[undefined, null, 1.5, 1, -Infinity], 1],
        [['42', NaN, '44', '43', 42, {}], 44],
        [[Infinity, '101', 100, 99, Number.MIN_VALUE], 100],
      ];

      test.each(cases)('%p', (value, expectedScore) => {
        testIt({
          fieldValue: value,
          scoreDefault: 57,
          scoreMapping: mappingToSingleField(),
          expected: overridenScoreOf(expectedScore),
        });
      });
    });
  });
});

interface TestCase {
  fieldValue: unknown;
  scoreDefault: RiskScore;
  scoreMapping: RiskScoreMappingOrUndefined;
  expected: BuildRiskScoreFromMappingReturn;
}

function testIt({ fieldValue, scoreDefault, scoreMapping, expected }: TestCase) {
  const result = buildRiskScoreFromMapping({
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

function overridenScoreOf(value: number) {
  return {
    riskScore: value,
    riskScoreMeta: { riskScoreOverridden: true },
  };
}
