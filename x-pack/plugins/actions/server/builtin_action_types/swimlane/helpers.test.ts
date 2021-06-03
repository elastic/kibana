/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getBodyForEventAction } from './helpers';
import { mappings } from './mocks';

describe('Create Record Mapping', () => {
  const appId = '45678';

  test('Mapping is Successful', () => {
    const params = {
      alertId: 'al123',
      ruleName: 'Rule Name',
      severity: 'Critical',
      alertSource: 'Elastic',
      caseName: 'Case Name',
      caseId: 'es3456789',
      comments: 'This is a comment',
      description: 'case desc',
      externalId: null,
    };
    const data = getBodyForEventAction(appId, mappings, params);
    expect(data?.values?.[mappings.alertSourceConfig?.id ?? 0]).toEqual(params.alertSource);
    expect(data?.values?.[mappings.ruleNameConfig.id]).toEqual(params.ruleName);
    expect(data?.values?.[mappings.caseNameConfig?.id ?? 0]).toEqual(params.caseName);
    expect(data?.values?.[mappings.caseIdConfig?.id ?? 0]).toEqual(params.caseId);
    expect(data?.values?.[mappings.commentsConfig?.id ?? 0]).toEqual(params.comments);
    expect(data?.values?.[mappings?.severityConfig?.id ?? 0]).toEqual(params.severity);
    expect(data?.values?.[mappings?.descriptionConfig?.id ?? 0]).toEqual(params.description);
  });
});
