/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { AlertingActions } from './alerting';

const version = '1.0.0-zeta1';

describe('#get', () => {
  [null, undefined, '', 1, true, {}].forEach((alertType: any) => {
    test(`alertType of ${JSON.stringify(alertType)} throws error`, () => {
      const alertingActions = new AlertingActions(version);
      expect(() =>
        alertingActions.get(alertType, 'consumer', 'foo-action')
      ).toThrowErrorMatchingSnapshot();
    });
  });

  [null, undefined, '', 1, true, {}].forEach((operation: any) => {
    test(`operation of ${JSON.stringify(operation)} throws error`, () => {
      const alertingActions = new AlertingActions(version);
      expect(() =>
        alertingActions.get('foo-alertType', 'consumer', operation)
      ).toThrowErrorMatchingSnapshot();
    });
  });

  [null, '', 1, true, undefined, {}].forEach((consumer: any) => {
    test(`consumer of ${JSON.stringify(consumer)} throws error`, () => {
      const alertingActions = new AlertingActions(version);
      expect(() =>
        alertingActions.get('foo-alertType', consumer, 'operation')
      ).toThrowErrorMatchingSnapshot();
    });
  });

  test('returns `alerting:${alertType}/${consumer}/${operation}`', () => {
    const alertingActions = new AlertingActions(version);
    expect(alertingActions.get('foo-alertType', 'consumer', 'bar-operation')).toBe(
      'alerting:1.0.0-zeta1:foo-alertType/consumer/bar-operation'
    );
  });
});
