/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { AlertInstance } from './alert_instance';
import { createAlertInstanceFactory } from './create_alert_instance_factory';

test('creates new instances for ones not passed in', () => {
  const alertInstanceFactory = createAlertInstanceFactory({});
  const result = alertInstanceFactory('1');
  expect(result).toMatchInlineSnapshot(`
Object {
  "meta": Object {},
  "state": Object {},
}
`);
});

test('reuses existing instances', () => {
  const alertInstance = new AlertInstance({ state: { foo: true }, meta: { bar: false } });
  const alertInstanceFactory = createAlertInstanceFactory({
    '1': alertInstance,
  });
  const result = alertInstanceFactory('1');
  expect(result).toMatchInlineSnapshot(`
Object {
  "meta": Object {
    "bar": false,
  },
  "state": Object {
    "foo": true,
  },
}
`);
});

test('mutates given instances', () => {
  const alertInstances = {};
  const alertInstanceFactory = createAlertInstanceFactory(alertInstances);
  alertInstanceFactory('1');
  expect(alertInstances).toMatchInlineSnapshot(`
Object {
  "1": Object {
    "meta": Object {},
    "state": Object {},
  },
}
`);
});
