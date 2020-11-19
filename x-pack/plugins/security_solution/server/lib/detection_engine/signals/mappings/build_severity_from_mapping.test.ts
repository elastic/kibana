/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { sampleDocNoSortId, sampleDocSeverity } from '../__mocks__/es_results';
import { buildSeverityFromMapping } from './build_severity_from_mapping';

describe('buildSeverityFromMapping', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('severity defaults to provided if mapping is undefined', () => {
    const severity = buildSeverityFromMapping({
      eventSource: sampleDocNoSortId()._source,
      severity: 'low',
      severityMapping: undefined,
    });

    expect(severity).toEqual({ severity: 'low', severityMeta: {} });
  });

  test('severity is overridden to highest matched mapping', () => {
    const severity = buildSeverityFromMapping({
      eventSource: sampleDocSeverity(23)._source,
      severity: 'low',
      severityMapping: [
        { field: 'event.severity', operator: 'equals', value: '23', severity: 'critical' },
        { field: 'event.severity', operator: 'equals', value: '23', severity: 'low' },
        { field: 'event.severity', operator: 'equals', value: '11', severity: 'critical' },
        { field: 'event.severity', operator: 'equals', value: '23', severity: 'medium' },
      ],
    });

    expect(severity).toEqual({
      severity: 'critical',
      severityMeta: {
        severityOverrideField: 'event.severity',
      },
    });
  });

  test('severity is overridden when field is event.severity and source value is number', () => {
    const severity = buildSeverityFromMapping({
      eventSource: sampleDocSeverity(23)._source,
      severity: 'low',
      severityMapping: [
        { field: 'event.severity', operator: 'equals', value: '13', severity: 'low' },
        { field: 'event.severity', operator: 'equals', value: '23', severity: 'medium' },
        { field: 'event.severity', operator: 'equals', value: '33', severity: 'high' },
        { field: 'event.severity', operator: 'equals', value: '43', severity: 'critical' },
      ],
    });

    expect(severity).toEqual({
      severity: 'medium',
      severityMeta: {
        severityOverrideField: 'event.severity',
      },
    });
  });

  // TODO: Enhance...
});
