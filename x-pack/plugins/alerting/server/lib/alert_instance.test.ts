/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { AlertInstance } from './alert_instance';

describe('shouldFire()', () => {
  test('defaults to false', () => {
    const alertInstance = new AlertInstance();
    expect(alertInstance.shouldFire()).toEqual(false);
  });
});

describe('getFireOptions()', () => {
  test('defaults to undefined', () => {
    const alertInstance = new AlertInstance();
    expect(alertInstance.getFireOptions()).toBeUndefined();
  });
});

describe('resetFire()', () => {
  test('makes shouldFire() return false', () => {
    const alertInstance = new AlertInstance();
    alertInstance.fire('default');
    expect(alertInstance.shouldFire()).toEqual(true);
    alertInstance.resetFire();
    expect(alertInstance.shouldFire()).toEqual(false);
  });

  test('makes getFireOptions() return undefined', () => {
    const alertInstance = new AlertInstance();
    alertInstance.fire('default');
    expect(alertInstance.getFireOptions()).toEqual({
      actionGroup: 'default',
      context: {},
      state: {},
    });
    alertInstance.resetFire();
    expect(alertInstance.getFireOptions()).toBeUndefined();
  });
});

describe('getState()', () => {
  test('returns state passed to constructor', () => {
    const state = { foo: true };
    const alertInstance = new AlertInstance({ state });
    expect(alertInstance.getState()).toEqual(state);
  });
});

describe('getMeta()', () => {
  test('returns meta passed to constructor', () => {
    const meta = { bar: true };
    const alertInstance = new AlertInstance({ meta });
    expect(alertInstance.getMeta()).toEqual(meta);
  });
});

describe('fire()', () => {
  test('makes shouldFire() return true', () => {
    const alertInstance = new AlertInstance({ state: { foo: true }, meta: { bar: true } });
    alertInstance.replaceState({ otherField: true }).fire('default', { field: true });
    expect(alertInstance.shouldFire()).toEqual(true);
  });

  test('makes getFireOptions() return given options', () => {
    const alertInstance = new AlertInstance({ state: { foo: true }, meta: { bar: true } });
    alertInstance.replaceState({ otherField: true }).fire('default', { field: true });
    expect(alertInstance.getFireOptions()).toEqual({
      actionGroup: 'default',
      context: { field: true },
      state: { otherField: true },
    });
  });

  test('cannot fire twice', () => {
    const alertInstance = new AlertInstance();
    alertInstance.fire('default', { field: true });
    expect(() =>
      alertInstance.fire('default', { field: false })
    ).toThrowErrorMatchingInlineSnapshot(`"Alert instance already fired, cannot fire twice"`);
  });
});

describe('replaceState()', () => {
  test('replaces previous state', () => {
    const alertInstance = new AlertInstance({ state: { foo: true } });
    alertInstance.replaceState({ bar: true });
    expect(alertInstance.getState()).toEqual({ bar: true });
    alertInstance.replaceState({ baz: true });
    expect(alertInstance.getState()).toEqual({ baz: true });
  });
});

describe('replaceMeta()', () => {
  test('replaces previous meta', () => {
    const alertInstance = new AlertInstance({ meta: { foo: true } });
    alertInstance.replaceMeta({ bar: true });
    expect(alertInstance.getMeta()).toEqual({ bar: true });
    alertInstance.replaceMeta({ baz: true });
    expect(alertInstance.getMeta()).toEqual({ baz: true });
  });
});

describe('toJSON', () => {
  test('only serializes state and meta', () => {
    const alertInstance = new AlertInstance({
      state: { foo: true },
      meta: { bar: true },
    });
    expect(JSON.stringify(alertInstance)).toEqual('{"state":{"foo":true},"meta":{"bar":true}}');
  });
});
