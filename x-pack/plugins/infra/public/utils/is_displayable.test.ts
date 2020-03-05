/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { isDisplayable } from './is_displayable';

describe('isDisplayable()', () => {
  test('field that is not displayable', () => {
    const field = {
      name: 'some.field',
      type: 'number',
      displayable: false,
    };
    expect(isDisplayable(field)).toBe(false);
  });
  test('field that is displayable', () => {
    const field = {
      name: 'some.field',
      type: 'number',
      displayable: true,
    };
    expect(isDisplayable(field)).toBe(true);
  });
  test('field that an ecs field', () => {
    const field = {
      name: '@timestamp',
      type: 'date',
      displayable: true,
    };
    expect(isDisplayable(field)).toBe(true);
  });
  test('field that matches same prefix', () => {
    const field = {
      name: 'system.network.name',
      type: 'string',
      displayable: true,
    };
    expect(isDisplayable(field, ['system.network'])).toBe(true);
  });
  test('field that does not matches same prefix', () => {
    const field = {
      name: 'system.load.1',
      type: 'number',
      displayable: true,
    };
    expect(isDisplayable(field, ['system.network'])).toBe(false);
  });
  test('field that is an K8s allowed field but does not match prefix', () => {
    const field = {
      name: 'kubernetes.namespace',
      type: 'string',
      displayable: true,
    };
    expect(isDisplayable(field, ['kubernetes.pod'])).toBe(true);
  });
  test('field that is a Prometheus allowed field but does not match prefix', () => {
    const field = {
      name: 'prometheus.labels.foo.bar',
      type: 'string',
      displayable: true,
    };
    expect(isDisplayable(field, ['prometheus.metrics'])).toBe(true);
  });
});
