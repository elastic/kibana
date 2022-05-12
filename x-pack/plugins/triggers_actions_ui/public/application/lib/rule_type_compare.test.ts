/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RuleTypeModel } from '../../types';
import { ruleTypeGroupCompare, ruleTypeCompare } from './rule_type_compare';
import { IsEnabledResult, IsDisabledResult } from './check_rule_type_enabled';

test('should sort groups by containing enabled rule types first and then by name', async () => {
  const ruleTypes: Array<
    [
      string,
      Array<{
        id: string;
        name: string;
        checkEnabledResult: IsEnabledResult | IsDisabledResult;
        ruleTypeItem: RuleTypeModel;
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
          ruleTypeItem: {
            id: 'my-rule-type',
            iconClass: 'test',
            description: 'Alert when testing',
            documentationUrl: 'https://localhost.local/docs',
            validate: () => {
              return { errors: {} };
            },
            ruleParamsExpression: () => null,
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
          ruleTypeItem: {
            id: 'my-rule-type',
            iconClass: 'test',
            description: 'Alert when testing',
            documentationUrl: 'https://localhost.local/docs',
            validate: () => {
              return { errors: {} };
            },
            ruleParamsExpression: () => null,
            requiresAppContext: false,
          },
        },
        {
          id: '3',
          name: 'cdf',
          checkEnabledResult: { isEnabled: true },
          ruleTypeItem: {
            id: 'disabled-rule-type',
            iconClass: 'test',
            description: 'Alert when testing',
            documentationUrl: 'https://localhost.local/docs',
            validate: () => {
              return { errors: {} };
            },
            ruleParamsExpression: () => null,
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
          ruleTypeItem: {
            id: 'my-rule-type',
            iconClass: 'test',
            description: 'Alert when testing',
            documentationUrl: 'https://localhost.local/docs',
            validate: () => {
              return { errors: {} };
            },
            ruleParamsExpression: () => null,
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

  const result = [...ruleTypes].sort((right, left) => ruleTypeGroupCompare(right, left, groups));
  expect(result[0]).toEqual(ruleTypes[1]);
  expect(result[1]).toEqual(ruleTypes[2]);
  expect(result[2]).toEqual(ruleTypes[0]);
});

test('should sort rule types by enabled first and then by name', async () => {
  const ruleTypes: Array<{
    id: string;
    name: string;
    checkEnabledResult: IsEnabledResult | IsDisabledResult;
    ruleTypeItem: RuleTypeModel;
  }> = [
    {
      id: '1',
      name: 'bcd',
      checkEnabledResult: { isEnabled: false, message: 'gold license' },
      ruleTypeItem: {
        id: 'my-rule-type',
        iconClass: 'test',
        description: 'Alert when testing',
        documentationUrl: 'https://localhost.local/docs',
        validate: () => {
          return { errors: {} };
        },
        ruleParamsExpression: () => null,
        requiresAppContext: false,
      },
    },
    {
      id: '2',
      name: 'abc',
      checkEnabledResult: { isEnabled: false, message: 'platinum license' },
      ruleTypeItem: {
        id: 'my-rule-type',
        iconClass: 'test',
        description: 'Alert when testing',
        documentationUrl: 'https://localhost.local/docs',
        validate: () => {
          return { errors: {} };
        },
        ruleParamsExpression: () => null,
        requiresAppContext: false,
      },
    },
    {
      id: '3',
      name: 'cdf',
      checkEnabledResult: { isEnabled: true },
      ruleTypeItem: {
        id: 'disabled-rule-type',
        iconClass: 'test',
        description: 'Alert when testing',
        documentationUrl: 'https://localhost.local/docs',
        validate: () => {
          return { errors: {} };
        },
        ruleParamsExpression: () => null,
        requiresAppContext: false,
      },
    },
  ];
  const result = [...ruleTypes].sort(ruleTypeCompare);
  expect(result[0]).toEqual(ruleTypes[2]);
  expect(result[1]).toEqual(ruleTypes[1]);
  expect(result[2]).toEqual(ruleTypes[0]);
});
