/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CasesActions } from './cases';

const version = '1.0.0-zeta1';

describe('#get', () => {
  [null, undefined, '', 1, true, {}].forEach((operation: any) => {
    test(`operation of ${JSON.stringify(operation)} throws error`, () => {
      const alertingActions = new CasesActions(version);
      expect(() => alertingActions.get('consumer', operation)).toThrowErrorMatchingSnapshot();
    });
  });

  [null, undefined, '', 1, true, {}].forEach((consumer: any) => {
    test(`consumer of ${JSON.stringify(consumer)} throws error`, () => {
      const alertingActions = new CasesActions(version);
      expect(() => alertingActions.get(consumer, 'operation')).toThrowErrorMatchingSnapshot();
    });
  });

  test('returns `cases:${consumer}/${operation}`', () => {
    const alertingActions = new CasesActions(version);
    expect(alertingActions.get('consumer', 'bar-operation')).toBe(
      'cases:1.0.0-zeta1:consumer/bar-operation'
    );
  });
});
