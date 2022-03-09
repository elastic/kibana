/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RuleType, ActionVariables } from '../../types';
import { transformActionVariables } from './action_variables';
import { ALERTS_FEATURE_ID } from '../../../../alerting/common';

beforeEach(() => jest.resetAllMocks());

const mockContextVariables = (withBraces: boolean = false) => [
  {
    name: 'fooC',
    description: 'fooC-description',
    ...(withBraces && { useWithTripleBracesInTemplates: true }),
  },
  { name: 'barC', description: 'barC-description' },
];

const mockStateVariables = (withBraces: boolean = false) => [
  { name: 'fooS', description: 'fooS-description' },
  {
    name: 'barS',
    description: 'barS-description',
    ...(withBraces && { useWithTripleBracesInTemplates: true }),
  },
];

const mockParamsVariables = (withBraces: boolean = false) => [
  {
    name: 'fooP',
    description: 'fooP-description',
    ...(withBraces && { useWithTripleBracesInTemplates: true }),
  },
];

const expectedTransformResult = [
  { description: 'The ID of the rule.', name: 'rule.id' },
  { description: 'The name of the rule.', name: 'rule.name' },
  { description: 'The space ID of the rule.', name: 'rule.spaceId' },
  { description: 'The tags of the rule.', name: 'rule.tags' },
  { description: 'The type of rule.', name: 'rule.type' },
  { description: 'The date the rule scheduled the action.', name: 'date' },
  { description: 'The ID of the alert that scheduled actions for the rule.', name: 'alert.id' },
  {
    description: 'The action group of the alert that scheduled actions for the rule.',
    name: 'alert.actionGroup',
  },
  {
    description: 'The action subgroup of the alert that scheduled actions for the rule.',
    name: 'alert.actionSubgroup',
  },
  {
    description:
      'The human readable name of the action group of the alert that scheduled actions for the rule.',
    name: 'alert.actionGroupName',
  },
  {
    description: 'The configured server.publicBaseUrl value or empty string if not configured.',
    name: 'kibanaBaseUrl',
  },
  {
    deprecated: true,
    description: 'This has been deprecated in favor of rule.id.',
    name: 'alertId',
  },
  {
    deprecated: true,
    description: 'This has been deprecated in favor of rule.name.',
    name: 'alertName',
  },
  {
    deprecated: true,
    description: 'This has been deprecated in favor of alert.id.',
    name: 'alertInstanceId',
  },
  {
    deprecated: true,
    description: 'This has been deprecated in favor of alert.actionGroup.',
    name: 'alertActionGroup',
  },
  {
    deprecated: true,
    description: 'This has been deprecated in favor of alert.actionGroupName.',
    name: 'alertActionGroupName',
  },
  {
    deprecated: true,
    description: 'This has been deprecated in favor of alert.actionSubgroup.',
    name: 'alertActionSubgroup',
  },
  {
    deprecated: true,
    description: 'This has been deprecated in favor of rule.spaceId.',
    name: 'spaceId',
  },
  {
    deprecated: true,
    description: 'This has been deprecated in favor of rule.tags.',
    name: 'tags',
  },
];

const expectedContextTransformResult = (withBraces: boolean = false) => [
  {
    description: 'fooC-description',
    name: 'context.fooC',
    ...(withBraces && { useWithTripleBracesInTemplates: true }),
  },
  {
    description: 'barC-description',
    name: 'context.barC',
  },
];

const expectedStateTransformResult = (withBraces: boolean = false) => [
  { description: 'fooS-description', name: 'state.fooS' },
  {
    description: 'barS-description',
    name: 'state.barS',
    ...(withBraces && { useWithTripleBracesInTemplates: true }),
  },
];

const expectedParamsTransformResult = (withBraces: boolean = false) => [
  {
    description: 'fooP-description',
    name: 'params.fooP',
    ...(withBraces && { useWithTripleBracesInTemplates: true }),
  },
];

describe('transformActionVariables', () => {
  test('should return correct variables when no state, no context, no params provided', async () => {
    const alertType = getAlertType({ context: [], state: [], params: [] });
    expect(transformActionVariables(alertType.actionVariables)).toEqual(expectedTransformResult);
  });

  test('should return correct variables when context is provided', async () => {
    const alertType = getAlertType({
      context: mockContextVariables(),
      state: [],
      params: [],
    });
    expect(transformActionVariables(alertType.actionVariables)).toEqual([
      ...expectedTransformResult,
      ...expectedContextTransformResult(),
    ]);
  });

  test('should return correct variables when state is provided', async () => {
    const alertType = getAlertType({
      context: [],
      state: mockStateVariables(),
      params: [],
    });
    expect(transformActionVariables(alertType.actionVariables)).toEqual([
      ...expectedTransformResult,
      ...expectedStateTransformResult(),
    ]);
  });

  test('should return correct variables when context, state and params are provided', async () => {
    const alertType = getAlertType({
      context: mockContextVariables(),
      state: mockStateVariables(),
      params: mockParamsVariables(),
    });
    expect(transformActionVariables(alertType.actionVariables)).toEqual([
      ...expectedTransformResult,
      ...expectedContextTransformResult(),
      ...expectedParamsTransformResult(),
      ...expectedStateTransformResult(),
    ]);
  });

  test('should return useWithTripleBracesInTemplates with action variables if specified', () => {
    const alertType = getAlertType({
      context: mockContextVariables(true),
      state: mockStateVariables(true),
      params: mockParamsVariables(true),
    });
    expect(transformActionVariables(alertType.actionVariables)).toEqual([
      ...expectedTransformResult,
      ...expectedContextTransformResult(true),
      ...expectedParamsTransformResult(true),
      ...expectedStateTransformResult(true),
    ]);
  });

  test(`should return only the required action variables when omitMessageVariables is "all"`, () => {
    const alertType = getAlertType({
      context: mockContextVariables(),
      state: mockStateVariables(),
      params: mockParamsVariables(),
    });
    expect(transformActionVariables(alertType.actionVariables, 'all')).toEqual([
      ...expectedTransformResult,
      ...expectedParamsTransformResult(),
    ]);
  });

  test(`should return required and context action variables when omitMessageVariables is "keepContext"`, () => {
    const alertType = getAlertType({
      context: mockContextVariables(),
      state: mockStateVariables(),
      params: mockParamsVariables(),
    });
    expect(transformActionVariables(alertType.actionVariables, 'keepContext')).toEqual([
      ...expectedTransformResult,
      ...expectedContextTransformResult(),
      ...expectedParamsTransformResult(),
    ]);
  });
});

function getAlertType(actionVariables: ActionVariables): RuleType {
  return {
    id: 'test',
    name: 'Test',
    actionVariables,
    actionGroups: [{ id: 'default', name: 'Default' }],
    defaultActionGroupId: 'default',
    recoveryActionGroup: { id: 'recovered', name: 'Recovered' },
    authorizedConsumers: {},
    producer: ALERTS_FEATURE_ID,
    minimumLicenseRequired: 'basic',
    enabledInLicense: true,
  };
}
