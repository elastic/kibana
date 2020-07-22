/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { sampleDocNoSortId } from '../__mocks__/es_results';
import { buildSeverityFromMapping } from './build_severity_from_mapping';

describe('buildSeverityFromMapping', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('severity defaults to provided if mapping is incomplete', () => {
    const severity = buildSeverityFromMapping({
      doc: sampleDocNoSortId(),
      severity: 'low',
      severityMapping: undefined,
    });

    expect(severity).toEqual({ severity: 'low', severityMeta: {} });
  });

  // TODO: Enhance...
});
