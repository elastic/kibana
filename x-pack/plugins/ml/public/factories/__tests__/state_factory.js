/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */



import expect from 'expect.js';
import ngMock from 'ng_mock';

import { stateFactoryProvider } from '../state_factory';

describe('ML - mlStateFactory', () => {
  let stateFactory;

  beforeEach(ngMock.module('kibana'));
  beforeEach(ngMock.inject(($injector) => {
    const Private = $injector.get('Private');
    stateFactory = Private(stateFactoryProvider);
  }));

  it('Throws an error when called without arguments.', () => {
    expect(() => stateFactory()).to.throwError();
  });

  it('Initializes a custom state store, sets and gets a test value.', () => {
    const state = stateFactory('testName');
    state.set('testValue', 10);
    expect(state.get('testValue')).to.be(10);
  });

  it('Initializes with custom default state and uses reset.', () => {
    const state = stateFactory('testName', {
      testValue: 1
    });

    expect(state.get('testValue')).to.be(1);
    state.set('testValue', 2);
    expect(state.get('testValue')).to.be(2);
    state.reset();
    expect(state.get('testValue')).to.be(1);
  });

  it('Initializes a custom state store, sets and gets a test value using events.', (done) => {
    const state = stateFactory('testName');

    state.watch(() => {
      expect(state.get('testValue')).to.be(10);
      done();
    });

    state.set('testValue', 10);
    state.changed();
  });
});
