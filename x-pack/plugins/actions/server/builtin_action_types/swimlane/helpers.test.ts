/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getBodyForEventAction, removeUnsafeFields } from './helpers';
import { mappings } from './mocks';

describe('Create Record Mapping', () => {
  const appId = '45678';

  test('Mapping is Successful', () => {
    const params = {
      alertName: 'Alert Name',
      severity: 'Critical',
      alertSource: 'Elastic',
      caseName: 'Case Name',
      caseId: 'es3456789',
      comments: 'This is a comment',
      externalId: null,
    };
    const data = getBodyForEventAction(appId, mappings, params);
    expect(data?.values?.[mappings.alertSourceConfig?.id ?? 0]).toEqual(params.alertSource);
    expect(data?.values?.[mappings.alertNameConfig.id]).toEqual(params.alertName);
    expect(data?.values?.[mappings.caseNameConfig?.id ?? 0]).toEqual(params.caseName);
    expect(data?.values?.[mappings.caseIdConfig?.id ?? 0]).toEqual(params.caseId);
    expect(data?.values?.[mappings.commentsConfig?.id ?? 0]).toEqual(params.comments);
    expect(data?.values?.[mappings?.severityConfig?.id ?? 0]).toEqual(params.severity);
  });
});

describe('removeUnsafeFields', () => {
  const fields = [
    {
      id: '__proto__',
      name: 'Alert Source',
      key: 'alert-source',
      fieldType: 'text',
    },
    {
      id: 'adnjls',
      name: '__proto__',
      key: 'alert-source',
      fieldType: 'text',
    },
    {
      id: 'adnjls',
      name: 'Alert Source',
      key: '__proto__',
      fieldType: 'text',
    },
    {
      id: 'adnjls',
      name: 'Alert Source',
      key: 'alert-source',
      fieldType: '__proto__',
    },
    {
      id: 'safe',
      name: 'safe',
      key: 'safe',
      fieldType: 'safe',
    },
  ];
  test('it returns only safe fields', () => {
    const safeFields = removeUnsafeFields(fields);
    expect(safeFields).toEqual([fields[4]]);
  });
});
