/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AlertingActions } from './alerting';

const version = '1.0.0-zeta1';

describe('#get', () => {
  [null, undefined, '', 1, true, {}].forEach((ruleType: any) => {
    test(`ruleType of ${JSON.stringify(ruleType)} throws error`, () => {
      const alertingActions = new AlertingActions(version);
      expect(() =>
        alertingActions.get(ruleType, 'consumer', 'alertingType', 'foo-action')
      ).toThrowErrorMatchingSnapshot();
    });
  });

  [null, undefined, '', 1, true, {}].forEach((operation: any) => {
    test(`operation of ${JSON.stringify(operation)} throws error`, () => {
      const alertingActions = new AlertingActions(version);
      expect(() =>
        alertingActions.get('foo-ruleType', 'consumer', 'alertingType', operation)
      ).toThrowErrorMatchingSnapshot();
    });
  });

  [null, '', 1, true, undefined, {}].forEach((consumer: any) => {
    test(`consumer of ${JSON.stringify(consumer)} throws error`, () => {
      const alertingActions = new AlertingActions(version);
      expect(() =>
        alertingActions.get('foo-ruleType', consumer, 'alertingType', 'operation')
      ).toThrowErrorMatchingSnapshot();
    });
  });

  [null, '', 1, true, undefined, {}].forEach((alertingType: any) => {
    test(`alertingType of ${JSON.stringify(alertingType)} throws error`, () => {
      const alertingActions = new AlertingActions(version);
      expect(() =>
        alertingActions.get('foo-ruleType', 'consumer', alertingType, 'operation')
      ).toThrowErrorMatchingSnapshot();
    });
  });

  test('returns `alerting:${ruleType}/${consumer}/${alertingType}/${operation}`', () => {
    const alertingActions = new AlertingActions(version);
    expect(alertingActions.get('foo-ruleType', 'consumer', 'alertingType', 'bar-operation')).toBe(
      'alerting:1.0.0-zeta1:foo-ruleType/consumer/alertingType/bar-operation'
    );
  });
});
