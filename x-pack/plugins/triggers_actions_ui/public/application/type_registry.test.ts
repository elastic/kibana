/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TypeRegistry } from './type_registry';
import {
  ValidationResult,
  RuleTypeModel,
  ActionTypeModel,
  ConnectorValidationResult,
  GenericValidationResult,
} from '../types';
import { actionTypeRegistryMock } from './action_type_registry.mock';

export const ExpressionComponent: React.FunctionComponent = () => {
  return null;
};

const getTestRuleType = (id?: string, iconClass?: string) => {
  return {
    id: id || 'test-alet-type',
    description: 'Test description',
    iconClass: iconClass || 'icon',
    documentationUrl: null,
    validate: (): ValidationResult => {
      return { errors: {} };
    },
    ruleParamsExpression: ExpressionComponent,
    requiresAppContext: false,
  };
};

const getTestActionType = (
  id?: string,
  iconClass?: string,
  selectedMessage?: string
): ActionTypeModel<any, any> => {
  return actionTypeRegistryMock.createMockActionTypeModel({
    id: id || 'my-action-type',
    iconClass: iconClass || 'test',
    selectMessage: selectedMessage || 'test',
    validateConnector: (): Promise<ConnectorValidationResult<unknown, unknown>> => {
      return Promise.resolve({});
    },
    validateParams: (): Promise<GenericValidationResult<unknown>> => {
      const validationResult = { errors: {} };
      return Promise.resolve(validationResult);
    },
    actionConnectorFields: null,
  });
};

beforeEach(() => jest.resetAllMocks());

describe('register()', () => {
  test('able to register alert types', () => {
    const ruleTypeRegistry = new TypeRegistry<RuleTypeModel>();
    ruleTypeRegistry.register(getTestRuleType());
    expect(ruleTypeRegistry.has('test-alet-type')).toEqual(true);
  });

  test('throws error if alert type already registered', () => {
    const ruleTypeRegistry = new TypeRegistry<RuleTypeModel>();
    ruleTypeRegistry.register(getTestRuleType('my-test-alert-type-1'));
    expect(() =>
      ruleTypeRegistry.register(getTestRuleType('my-test-alert-type-1'))
    ).toThrowErrorMatchingInlineSnapshot(
      `"Object type \\"my-test-alert-type-1\\" is already registered."`
    );
  });
});

describe('get()', () => {
  test('returns action type', () => {
    const actionTypeRegistry = new TypeRegistry<ActionTypeModel>();
    actionTypeRegistry.register(getTestActionType('my-action-type-snapshot'));
    const actionType = actionTypeRegistry.get('my-action-type-snapshot');
    expect(actionType).toMatchInlineSnapshot(`
      Object {
        "actionConnectorFields": null,
        "actionParamsFields": Object {
          "$$typeof": Symbol(react.lazy),
          "_ctor": [Function],
          "_result": null,
          "_status": -1,
        },
        "iconClass": "test",
        "id": "my-action-type-snapshot",
        "selectMessage": "test",
        "validateConnector": [Function],
        "validateParams": [Function],
      }
    `);
  });

  test(`throw error when action type doesn't exist`, () => {
    const actionTypeRegistry = new TypeRegistry<ActionTypeModel>();
    expect(() =>
      actionTypeRegistry.get('not-exist-action-type')
    ).toThrowErrorMatchingInlineSnapshot(
      `"Object type \\"not-exist-action-type\\" is not registered."`
    );
  });
});

describe('list()', () => {
  test('returns list of action types', () => {
    const actionTypeRegistry = new TypeRegistry<ActionTypeModel>();
    const actionType = getTestActionType();
    actionTypeRegistry.register(actionType);
    const actionTypes = actionTypeRegistry.list();
    expect(actionTypes).toEqual([
      {
        id: 'my-action-type',
        iconClass: 'test',
        selectMessage: 'test',
        actionConnectorFields: null,
        actionParamsFields: actionType.actionParamsFields,
        validateConnector: actionTypes[0].validateConnector,
        validateParams: actionTypes[0].validateParams,
      },
    ]);
  });
});

describe('has()', () => {
  test('returns false for unregistered alert types', () => {
    const ruleTypeRegistry = new TypeRegistry<RuleTypeModel>();
    expect(ruleTypeRegistry.has('my-alert-type')).toEqual(false);
  });

  test('returns true after registering an alert type', () => {
    const ruleTypeRegistry = new TypeRegistry<RuleTypeModel>();
    ruleTypeRegistry.register(getTestRuleType());
    expect(ruleTypeRegistry.has('test-alet-type'));
  });
});
