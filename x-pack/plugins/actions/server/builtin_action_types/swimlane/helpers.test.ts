/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MappingConfigType } from './types';
import { getBodyForEventAction, removeUnsafeFields } from './helpers';

describe('Create Record Mapping', () => {
  let mappingConfig: MappingConfigType;
  const appId = '45678';

  beforeAll(() => {
    mappingConfig = {
      alertSourceConfig: {
        id: 'adnjls',
        name: 'Alert Source',
        key: 'alert-source',
        fieldType: 'text',
      },
      severityConfig: {
        id: 'adnlas',
        name: 'Severity',
        key: 'severity',
        fieldType: 'text',
      },
      alertNameConfig: {
        id: 'adnfls',
        name: 'Alert Name',
        key: 'alert-name',
        fieldType: 'text',
      },
      caseIdConfig: {
        id: 'a6sst',
        name: 'Case Id',
        key: 'case-id-name',
        fieldType: 'text',
      },
      caseNameConfig: {
        id: 'a6fst',
        name: 'Case Name',
        key: 'case-name',
        fieldType: 'text',
      },
      commentsConfig: {
        id: 'a6fdf',
        name: 'Comments',
        key: 'comments',
        fieldType: 'text',
      },
    };
  });

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
    const data = getBodyForEventAction(appId, mappingConfig, params);
    expect(data?.values?.[mappingConfig.alertSourceConfig?.id ?? 0]).toEqual(params.alertSource);
    expect(data?.values?.[mappingConfig.alertNameConfig.id]).toEqual(params.alertName);
    expect(data?.values?.[mappingConfig.caseNameConfig?.id ?? 0]).toEqual(params.caseName);
    expect(data?.values?.[mappingConfig.caseIdConfig?.id ?? 0]).toEqual(params.caseId);
    expect(data?.values?.[mappingConfig.commentsConfig?.id ?? 0]).toEqual(params.comments);
    expect(data?.values?.[mappingConfig?.severityConfig?.id ?? 0]).toEqual(params.severity);
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
