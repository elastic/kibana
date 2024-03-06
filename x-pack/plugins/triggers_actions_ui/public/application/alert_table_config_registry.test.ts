/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AlertTableConfigRegistry } from './alert_table_config_registry';

export const ExpressionComponent: React.FunctionComponent = () => {
  return null;
};

const getTestAlertTableConfig = (id?: string, ruleTypeIds?: string[]) => {
  return {
    id: id || 'test-alert-table-config',
    columns: [],
    ...(ruleTypeIds ? { ruleTypeIds } : {}),
  };
};

beforeEach(() => jest.resetAllMocks());

describe('register()', () => {
  test('able to register alert table config', () => {
    const alertTableConfigRegistry = new AlertTableConfigRegistry();
    alertTableConfigRegistry.register(getTestAlertTableConfig());
    expect(alertTableConfigRegistry.has('test-alert-table-config')).toEqual(true);
  });

  test('throws error if alert table config already registered', () => {
    const alertTableConfigRegistry = new AlertTableConfigRegistry();
    alertTableConfigRegistry.register(getTestAlertTableConfig('my-test-alert-type-1'));
    expect(() =>
      alertTableConfigRegistry.register(getTestAlertTableConfig('my-test-alert-type-1'))
    ).toThrowErrorMatchingInlineSnapshot(
      `"Object type \\"my-test-alert-type-1\\" is already registered."`
    );
  });
});

describe('get()', () => {
  test('returns alert table config', () => {
    const alertTableConfigRegistry = new AlertTableConfigRegistry();
    alertTableConfigRegistry.register(getTestAlertTableConfig('my-action-type-snapshot'));
    const alertTableConfig = alertTableConfigRegistry.get('my-action-type-snapshot');
    expect(alertTableConfig).toMatchInlineSnapshot(`
      Object {
        "columns": Array [],
        "id": "my-action-type-snapshot",
      }
    `);
  });

  test(`throw error when alert table config doesn't exist`, () => {
    const actionTypeRegistry = new AlertTableConfigRegistry();
    expect(() =>
      actionTypeRegistry.get('not-exist-action-type')
    ).toThrowErrorMatchingInlineSnapshot(
      `"Object type \\"not-exist-action-type\\" is not registered."`
    );
  });
});

describe('list()', () => {
  test('returns list of alert table config', () => {
    const alertTableConfigRegistry = new AlertTableConfigRegistry();
    const alertTableConfig = getTestAlertTableConfig();
    alertTableConfigRegistry.register(alertTableConfig);
    const alertTableConfigList = alertTableConfigRegistry.list();
    expect(alertTableConfigList).toMatchInlineSnapshot(`
      Array [
        Object {
          "columns": Array [],
          "id": "test-alert-table-config",
        },
      ]
    `);
  });
});

describe('has()', () => {
  test('returns false for unregistered alert table config', () => {
    const alertTableConfigRegistry = new AlertTableConfigRegistry();
    expect(alertTableConfigRegistry.has('my-alert-type')).toEqual(false);
  });

  test('returns true after registering an alert table config', () => {
    const alertTableConfigRegistry = new AlertTableConfigRegistry();
    alertTableConfigRegistry.register(getTestAlertTableConfig());
    expect(alertTableConfigRegistry.has('test-alert-table-config'));
  });
});

describe('update()', () => {
  test('returns object after updating for alert table config register', () => {
    const alertTableConfigRegistry = new AlertTableConfigRegistry();
    alertTableConfigRegistry.register(getTestAlertTableConfig());
    const toggleColumn = (columnId: string) => {};
    const updateObj = alertTableConfigRegistry.update('test-alert-table-config', {
      ...getTestAlertTableConfig(),
      actions: {
        toggleColumn,
      },
    });
    expect(updateObj).toMatchInlineSnapshot(`
      Object {
        "actions": Object {
          "toggleColumn": [Function],
        },
        "columns": Array [],
        "id": "test-alert-table-config",
      }
    `);
    expect(alertTableConfigRegistry.getActions('test-alert-table-config').toggleColumn).toEqual(
      toggleColumn
    );
  });

  test('throw an error in alert table config is not registred', () => {
    const alertTableConfigRegistry = new AlertTableConfigRegistry();
    const toggleColumn = (columnId: string) => {};
    expect(() =>
      alertTableConfigRegistry.update('test-alert-table-config', {
        ...getTestAlertTableConfig(),
        actions: {
          toggleColumn,
        },
      })
    ).toThrowErrorMatchingInlineSnapshot(
      `"Object type \\"test-alert-table-config\\" is not registered."`
    );
  });
});

describe('getAlertConfigIdPerRuleTypes()', () => {
  const alertTableConfigRegistry = new AlertTableConfigRegistry();
  beforeAll(() => {
    alertTableConfigRegistry.register(
      getTestAlertTableConfig('ml-alerts-table', ['xpack-ml-anomaly'])
    );
    alertTableConfigRegistry.register(
      getTestAlertTableConfig('o11y-alerts-table', [
        'o11y-custom-threshold',
        'o11y-apm-threshold',
        'o11y-log-threshold',
        'o11y-metric-threshold',
      ])
    );
    alertTableConfigRegistry.register(getTestAlertTableConfig('security-alerts-table', []));
  });

  test('should return a config ID if match one ruleTypeId match with a configuration', () => {
    const configId = alertTableConfigRegistry.getAlertConfigIdPerRuleTypes(['xpack-ml-anomaly']);
    expect(configId).toEqual('ml-alerts-table');
  });

  test('should return a config ID if more that one ruleTypeId match with a configuration', () => {
    const configId = alertTableConfigRegistry.getAlertConfigIdPerRuleTypes([
      'o11y-apm-threshold',
      'o11y-metric-threshold',
    ]);
    expect(configId).toEqual('o11y-alerts-table');
  });

  test('should return the generic config ID if more that one ruleTypeId match with more than one configuration', () => {
    const configId = alertTableConfigRegistry.getAlertConfigIdPerRuleTypes([
      'o11y-apm-threshold',
      'o11y-metric-threshold',
      'ml-alerts-table',
    ]);
    expect(configId).toEqual('stackAlerts-generic-alerts-table');
  });

  test('should return the generic config ID if empty ruleTypeIds match with a configuration', () => {
    const configId = alertTableConfigRegistry.getAlertConfigIdPerRuleTypes([]);
    expect(configId).toEqual('stackAlerts-generic-alerts-table');
  });

  test('should return the generic config ID if an unknown ruleTypeId match with NO configuration', () => {
    const configId = alertTableConfigRegistry.getAlertConfigIdPerRuleTypes(['unknown-threshold']);
    expect(configId).toEqual('stackAlerts-generic-alerts-table');
  });
});
