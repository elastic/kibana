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
  let AppState;

  beforeEach(ngMock.module('kibana'));
  beforeEach(ngMock.inject(($injector) => {
    AppState = $injector.get('AppState');
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

  it(`Malformed AppState, state falls back to undefined, doesn't throw an error`, () => {
    const state = stateFactory('testName');

    // First update the state without interfering with AppState
    state.set('testValue', 1);
    expect(state.get('testValue')).to.be(1);

    // Manipulate AppState first, then set and get the custom state.
    const appState = new AppState();
    appState.fetch();
    appState.testName = undefined;
    appState.save();
    state.set('testValue', 2);
    expect(state.get('testValue')).to.be(2);

    // Now set the custom state, then manipulate AppState, then get the custom state.
    // Because AppState was malformed between set and get, the custom state will fallback
    // to the default state, in this case undefined
    state.set('testValue', 3);
    appState.fetch();
    appState.testName = undefined;
    appState.save();
    expect(state.get('testValue')).to.be(undefined);
  });

  it(`Malformed AppState, state falls back to default, doesn't throw an error`, () => {
    const state = stateFactory('testName', {
      testValue: 1
    });

    // First update the state without interfering with AppState
    state.set('testValue', 2);
    expect(state.get('testValue')).to.be(2);

    // Now set the custom state, then manipulate AppState, then get the custom state.
    // Because AppState was malformed between set and get, the custom state will fallback
    // to the default state, in this case 1
    state.set('testValue', 3);
    const appState = new AppState();
    appState.fetch();
    appState.testName = undefined;
    appState.save();
    expect(state.get('testValue')).to.be(1);
  });
});
