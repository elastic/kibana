/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AlertTypeModel } from '../../types';
import { alertTypeGroupCompare, alertTypeCompare } from './alert_type_compare';
import { IsEnabledResult, IsDisabledResult } from './check_alert_type_enabled';

test('should sort groups by containing enabled alert types first and then by name', async () => {
  const alertTypes: Array<
    [
      string,
      Array<{
        id: string;
        name: string;
        checkEnabledResult: IsEnabledResult | IsDisabledResult;
        alertTypeItem: AlertTypeModel;
      }>
    ]
  > = [
    [
      'abc',
      [
        {
          id: '1',
          name: 'test2',
          checkEnabledResult: { isEnabled: false, message: 'gold license' },
          alertTypeItem: {
            id: 'my-alert-type',
            iconClass: 'test',
            description: 'Alert when testing',
            documentationUrl: 'https://localhost.local/docs',
            validate: () => {
              return { errors: {} };
            },
            alertParamsExpression: () => null,
            requiresAppContext: false,
          },
        },
      ],
    ],
    [
      'bcd',
      [
        {
          id: '2',
          name: 'abc',
          checkEnabledResult: { isEnabled: false, message: 'platinum license' },
          alertTypeItem: {
            id: 'my-alert-type',
            iconClass: 'test',
            description: 'Alert when testing',
            documentationUrl: 'https://localhost.local/docs',
            validate: () => {
              return { errors: {} };
            },
            alertParamsExpression: () => null,
            requiresAppContext: false,
          },
        },
        {
          id: '3',
          name: 'cdf',
          checkEnabledResult: { isEnabled: true },
          alertTypeItem: {
            id: 'disabled-alert-type',
            iconClass: 'test',
            description: 'Alert when testing',
            documentationUrl: 'https://localhost.local/docs',
            validate: () => {
              return { errors: {} };
            },
            alertParamsExpression: () => null,
            requiresAppContext: false,
          },
        },
      ],
    ],
    [
      'cde',
      [
        {
          id: '4',
          name: 'cde',
          checkEnabledResult: { isEnabled: true },
          alertTypeItem: {
            id: 'my-alert-type',
            iconClass: 'test',
            description: 'Alert when testing',
            documentationUrl: 'https://localhost.local/docs',
            validate: () => {
              return { errors: {} };
            },
            alertParamsExpression: () => null,
            requiresAppContext: false,
          },
        },
      ],
    ],
  ];

  const groups = new Map<string, string>();
  groups.set('abc', 'ABC');
  groups.set('bcd', 'BCD');
  groups.set('cde', 'CDE');

  const result = [...alertTypes].sort((right, left) => alertTypeGroupCompare(right, left, groups));
  expect(result[0]).toEqual(alertTypes[1]);
  expect(result[1]).toEqual(alertTypes[2]);
  expect(result[2]).toEqual(alertTypes[0]);
});

test('should sort alert types by enabled first and then by name', async () => {
  const alertTypes: Array<{
    id: string;
    name: string;
    checkEnabledResult: IsEnabledResult | IsDisabledResult;
    alertTypeItem: AlertTypeModel;
  }> = [
    {
      id: '1',
      name: 'bcd',
      checkEnabledResult: { isEnabled: false, message: 'gold license' },
      alertTypeItem: {
        id: 'my-alert-type',
        iconClass: 'test',
        description: 'Alert when testing',
        documentationUrl: 'https://localhost.local/docs',
        validate: () => {
          return { errors: {} };
        },
        alertParamsExpression: () => null,
        requiresAppContext: false,
      },
    },
    {
      id: '2',
      name: 'abc',
      checkEnabledResult: { isEnabled: false, message: 'platinum license' },
      alertTypeItem: {
        id: 'my-alert-type',
        iconClass: 'test',
        description: 'Alert when testing',
        documentationUrl: 'https://localhost.local/docs',
        validate: () => {
          return { errors: {} };
        },
        alertParamsExpression: () => null,
        requiresAppContext: false,
      },
    },
    {
      id: '3',
      name: 'cdf',
      checkEnabledResult: { isEnabled: true },
      alertTypeItem: {
        id: 'disabled-alert-type',
        iconClass: 'test',
        description: 'Alert when testing',
        documentationUrl: 'https://localhost.local/docs',
        validate: () => {
          return { errors: {} };
        },
        alertParamsExpression: () => null,
        requiresAppContext: false,
      },
    },
  ];
  const result = [...alertTypes].sort(alertTypeCompare);
  expect(result[0]).toEqual(alertTypes[2]);
  expect(result[1]).toEqual(alertTypes[1]);
  expect(result[2]).toEqual(alertTypes[0]);
});
