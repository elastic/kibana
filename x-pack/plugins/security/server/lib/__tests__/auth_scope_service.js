/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from 'expect.js';
import sinon from 'sinon';

import { AuthScopeService } from '../auth_scope_service';

async function assertReject(fn, check) {
  try {
    await fn();
    throw new Error('expected function to reject the promise');
  } catch (error) {
    expect(() => { throw error; }).to.throwError(check);
  }
}

describe('getCredentialsScope()', function () {
  describe('basics', () => {
    it('does not take any arguments', () => {
      const authScope = new AuthScopeService();
      expect(authScope).to.be.a(AuthScopeService);
    });
  });

  describe('registerGetter()', () => {
    it('throws when not passed a function', () => {
      const authScope = new AuthScopeService();
      expect(() => authScope.registerGetter()).to.throwError('function');
      expect(() => authScope.registerGetter(null)).to.throwError('function');
      expect(() => authScope.registerGetter(0)).to.throwError('function');
      expect(() => authScope.registerGetter('')).to.throwError('function');
      expect(() => authScope.registerGetter([])).to.throwError('function');
      expect(() => authScope.registerGetter({})).to.throwError('function');
    });

    it('only calls the passed function when #getForRequestAndUser() is called', async () => {
      const authScope = new AuthScopeService();
      const stub = sinon.stub();
      authScope.registerGetter(stub);
      sinon.assert.notCalled(stub);
      const request = {};
      const user = {};
      await authScope.getForRequestAndUser(request, user);
      sinon.assert.calledOnce(stub);
      expect(stub.firstCall.args[0]).to.be(request);
      expect(stub.firstCall.args[1]).to.be(user);
    });
  });

  describe('#getForRequestAndUser()', () => {
    it('throws when request and user are not objects', async () => {
      const authScope = new AuthScopeService();
      await assertReject(() => authScope.getForRequestAndUser(null, {}), 'request object');
      await assertReject(() => authScope.getForRequestAndUser(1, {}), 'request object');
      await assertReject(() => authScope.getForRequestAndUser('abc', {}), 'request object');

      await assertReject(() => authScope.getForRequestAndUser({}, null), 'user object');
      await assertReject(() => authScope.getForRequestAndUser({}, 1), 'user object');
      await assertReject(() => authScope.getForRequestAndUser({}, 'abc'), 'user object');
    });

    it('returns a promise for an empty array by default', async () => {
      const authScope = new AuthScopeService();
      const scope = await authScope.getForRequestAndUser({}, {});
      expect(scope).to.eql([]);
    });

    it('calls each registered getter once each call', async () => {
      const authScope = new AuthScopeService();
      const getter1 = sinon.stub();
      const getter2 = sinon.stub();
      const getter3 = sinon.stub();

      authScope.registerGetter(getter1);
      authScope.registerGetter(getter2);
      authScope.registerGetter(getter3);

      await authScope.getForRequestAndUser({}, {});
      sinon.assert.calledOnce(getter1);
      sinon.assert.calledOnce(getter2);
      sinon.assert.calledOnce(getter3);

      await authScope.getForRequestAndUser({}, {});
      sinon.assert.calledTwice(getter1);
      sinon.assert.calledTwice(getter2);
      sinon.assert.calledTwice(getter3);

      await authScope.getForRequestAndUser({}, {});
      sinon.assert.calledThrice(getter1);
      sinon.assert.calledThrice(getter2);
      sinon.assert.calledThrice(getter3);
    });

    it('casts the return value of the getters to an produce a flat, unique array', async () => {
      const authScope = new AuthScopeService();
      authScope.registerGetter(() => undefined);
      authScope.registerGetter(() => null);
      authScope.registerGetter(() => ['foo', undefined, 'bar']);
      authScope.registerGetter(() => ['foo', 'foo1', 'foo2']);
      authScope.registerGetter(() => 'bar2');

      expect(await authScope.getForRequestAndUser({}, {})).to.eql(['foo', 'bar', 'foo1', 'foo2', 'bar2']);
    });
  });
});
