/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  Severity,
  SeverityMappingOrUndefined,
} from '../../../../../common/detection_engine/schemas/common/schemas';
import { sampleDocSeverity } from '../__mocks__/es_results';
import {
  buildSeverityFromMapping,
  BuildSeverityFromMappingReturn,
} from './build_severity_from_mapping';

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

  describe('base cases: when mapping to a single field', () => {
    // TODO: Discuss at Play Time. Support arbitrary fields and string values.
    test.skip(`severity is overridden if there's a match to a string`, () => {
      testIt({
        fieldValue: 'hackerman',
        severityDefault: 'low',
        severityMapping: [
          { field: 'event.severity', operator: 'equals', value: 'anything', severity: 'medium' },
          { field: 'event.severity', operator: 'equals', value: 'hackerman', severity: 'critical' },
        ],
        expected: overridenSeverityOf('critical'),
      });
    });

    test(`severity is overridden if there's a match to a number`, () => {
      testIt({
        fieldValue: 23,
        severityDefault: 'low',
        severityMapping: [
          { field: 'event.severity', operator: 'equals', value: '13', severity: 'low' },
          { field: 'event.severity', operator: 'equals', value: '23', severity: 'medium' },
          { field: 'event.severity', operator: 'equals', value: '33', severity: 'high' },
          { field: 'event.severity', operator: 'equals', value: '43', severity: 'critical' },
        ],
        expected: overridenSeverityOf('medium'),
      });
    });
  });

  describe('base cases: when mapping to an array', () => {
    test(`severity is overridden to highest matched mapping`, () => {
      testIt({
        fieldValue: [23, 'some string', 43, 33],
        severityDefault: 'low',
        severityMapping: [
          { field: 'event.severity', operator: 'equals', value: '13', severity: 'low' },
          { field: 'event.severity', operator: 'equals', value: '23', severity: 'medium' },
          { field: 'event.severity', operator: 'equals', value: '33', severity: 'high' },
          { field: 'event.severity', operator: 'equals', value: '43', severity: 'critical' },
        ],
        expected: overridenSeverityOf('critical'),
      });
    });
  });

  describe('edge cases: when mapping the same numerical value to different severities multiple times', () => {
    test('severity is overridden to highest matched mapping', () => {
      testIt({
        fieldValue: 23,
        severityDefault: 'low',
        severityMapping: [
          { field: 'event.severity', operator: 'equals', value: '23', severity: 'medium' },
          { field: 'event.severity', operator: 'equals', value: '23', severity: 'critical' },
          { field: 'event.severity', operator: 'equals', value: '23', severity: 'high' },
        ],
        expected: overridenSeverityOf('critical'),
      });
    });
  });
});

interface TestCase {
  fieldValue: unknown;
  severityDefault: Severity;
  severityMapping: SeverityMappingOrUndefined;
  expected: BuildSeverityFromMappingReturn;
}

function testIt({ fieldValue, severityDefault, severityMapping, expected }: TestCase) {
  const result = buildSeverityFromMapping({
    eventSource: sampleDocSeverity(fieldValue)._source,
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

function overridenSeverityOf(value: Severity) {
  return {
    severity: value,
    severityMeta: {
      severityOverrideField: 'event.severity',
    },
  };
}
