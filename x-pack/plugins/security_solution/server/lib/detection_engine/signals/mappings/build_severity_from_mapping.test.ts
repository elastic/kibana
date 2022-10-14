/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Severity, SeverityMapping } from '@kbn/securitysolution-io-ts-alerting-types';
import { sampleDocSeverity } from '../__mocks__/es_results';
import type { BuildSeverityFromMappingReturn } from './build_severity_from_mapping';
import { buildSeverityFromMapping } from './build_severity_from_mapping';

const ECS_FIELD = 'event.severity';
const ANY_FIELD = 'event.my_custom_severity';

describe('buildSeverityFromMapping', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('base cases: when mapping is undefined', () => {
    test('returns the provided default severity', () => {
      testIt({
        fieldValue: 23,
        severityDefault: 'low',
        severityMapping: undefined,
        expected: severityOf('low'),
      });
    });
  });

  describe('base cases: when mapping to the "event.severity" field from ECS', () => {
    test(`severity is overridden if there's a match to a number`, () => {
      testIt({
        fieldValue: 23,
        severityDefault: 'low',
        severityMapping: [
          { field: ECS_FIELD, operator: 'equals', value: '13', severity: 'low' },
          { field: ECS_FIELD, operator: 'equals', value: '23', severity: 'medium' },
          { field: ECS_FIELD, operator: 'equals', value: '33', severity: 'high' },
          { field: ECS_FIELD, operator: 'equals', value: '43', severity: 'critical' },
        ],
        expected: overriddenSeverityOf('medium'),
      });
    });

    test(`returns the default severity if there's a match to a string (ignores strings)`, () => {
      testIt({
        fieldValue: 'hackerman',
        severityDefault: 'low',
        severityMapping: [
          { field: ECS_FIELD, operator: 'equals', value: 'hackerman', severity: 'critical' },
        ],
        expected: severityOf('low'),
      });
    });
  });

  describe('base cases: when mapping to any other field containing a single value', () => {
    test(`severity is overridden if there's a match to a number`, () => {
      testIt({
        fieldName: ANY_FIELD,
        fieldValue: 23,
        severityDefault: 'low',
        severityMapping: [
          { field: ANY_FIELD, operator: 'equals', value: '13', severity: 'low' },
          { field: ANY_FIELD, operator: 'equals', value: '23', severity: 'medium' },
          { field: ANY_FIELD, operator: 'equals', value: '33', severity: 'high' },
          { field: ANY_FIELD, operator: 'equals', value: '43', severity: 'critical' },
        ],
        expected: overriddenSeverityOf('medium', ANY_FIELD),
      });
    });

    test(`severity is overridden if there's a match to a string`, () => {
      testIt({
        fieldName: ANY_FIELD,
        fieldValue: 'hackerman',
        severityDefault: 'low',
        severityMapping: [
          { field: ANY_FIELD, operator: 'equals', value: 'anything', severity: 'medium' },
          { field: ANY_FIELD, operator: 'equals', value: 'hackerman', severity: 'critical' },
        ],
        expected: overriddenSeverityOf('critical', ANY_FIELD),
      });
    });
  });

  describe('base cases: when mapping to an array', () => {
    test(`severity is overridden to highest matched mapping (works for "event.severity" field)`, () => {
      testIt({
        fieldValue: [23, 'some string', 43, 33],
        severityDefault: 'low',
        severityMapping: [
          { field: ECS_FIELD, operator: 'equals', value: '13', severity: 'low' },
          { field: ECS_FIELD, operator: 'equals', value: '23', severity: 'medium' },
          { field: ECS_FIELD, operator: 'equals', value: '33', severity: 'high' },
          { field: ECS_FIELD, operator: 'equals', value: '43', severity: 'critical' },
        ],
        expected: overriddenSeverityOf('critical'),
      });
    });

    test(`severity is overridden to highest matched mapping (works for any custom field)`, () => {
      testIt({
        fieldName: ANY_FIELD,
        fieldValue: ['foo', 'bar', 'baz', 'boo'],
        severityDefault: 'low',
        severityMapping: [
          { field: ANY_FIELD, operator: 'equals', value: 'bar', severity: 'high' },
          { field: ANY_FIELD, operator: 'equals', value: 'baz', severity: 'critical' },
          { field: ANY_FIELD, operator: 'equals', value: 'foo', severity: 'low' },
          { field: ANY_FIELD, operator: 'equals', value: 'boo', severity: 'medium' },
        ],
        expected: overriddenSeverityOf('critical', ANY_FIELD),
      });
    });
  });

  describe('edge cases: when mapping the same numerical value to different severities multiple times', () => {
    test('severity is overridden to highest matched mapping', () => {
      testIt({
        fieldValue: 23,
        severityDefault: 'low',
        severityMapping: [
          { field: ECS_FIELD, operator: 'equals', value: '23', severity: 'medium' },
          { field: ECS_FIELD, operator: 'equals', value: '23', severity: 'critical' },
          { field: ECS_FIELD, operator: 'equals', value: '23', severity: 'high' },
        ],
        expected: overriddenSeverityOf('critical'),
      });
    });
  });
});

interface TestCase {
  fieldName?: string;
  fieldValue: unknown;
  severityDefault: Severity;
  severityMapping: SeverityMapping | undefined;
  expected: BuildSeverityFromMappingReturn;
}

function testIt({ fieldName, fieldValue, severityDefault, severityMapping, expected }: TestCase) {
  const result = buildSeverityFromMapping({
    // @ts-expect-error @elastic/elasticsearch _source is optional
    eventSource: sampleDocSeverity(fieldValue, fieldName)._source,
    severity: severityDefault,
    severityMapping,
  });

  expect(result).toEqual(expected);
}

function severityOf(value: Severity) {
  return {
    severity: value,
    severityMeta: {},
  };
}

function overriddenSeverityOf(value: Severity, field = ECS_FIELD) {
  return {
    severity: value,
    severityMeta: {
      severityOverrideField: field,
    },
  };
}
