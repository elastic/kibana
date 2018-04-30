/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */



import expect from 'expect.js';
import ngMock from 'ng_mock';

import { listenerFactoryProvider } from '../listener_factory';

describe('ML - mlListenerFactory', () => {
  let listenerFactory;

  beforeEach(ngMock.module('kibana'));
  beforeEach(ngMock.inject(($injector) => {
    const Private = $injector.get('Private');
    listenerFactory = Private(listenerFactoryProvider);
  }));

  it('Calling factory doesn\'t throw.', () => {
    expect(() => listenerFactory()).to.not.throwError('Not initialized.');
  });

  it('Fires an event and listener receives value.', (done) => {
    const listener = listenerFactory();

    listener.watch((value) => {
      expect(value).to.be('test');
      done();
    });

    listener.changed('test');
  });
});
