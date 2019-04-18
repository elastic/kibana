/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import sinon from 'sinon';
import { AuthenticatedUser } from '../../common/model';
import { requestFixture } from './__tests__/__fixtures__/request';

import { AuthScopeService } from './auth_scope_service';

describe('getCredentialsScope()', function() {
  describe('basics', () => {
    it('does not take any arguments', () => {
      const authScope = new AuthScopeService();
      expect(authScope).toBeInstanceOf(AuthScopeService);
    });
  });

  describe('registerGetter()', () => {
    it('throws when not passed a function', () => {
      const authScope = new AuthScopeService();
      expect(() => authScope.registerGetter(undefined as any)).toThrowError(
        'Expected `getterFunction` to be a function'
      );
      expect(() => authScope.registerGetter(null as any)).toThrowError(
        'Expected `getterFunction` to be a function'
      );
      expect(() => authScope.registerGetter(0 as any)).toThrowError(
        'Expected `getterFunction` to be a function'
      );
      expect(() => authScope.registerGetter('' as any)).toThrowError(
        'Expected `getterFunction` to be a function'
      );
      expect(() => authScope.registerGetter([] as any)).toThrowError(
        'Expected `getterFunction` to be a function'
      );
      expect(() => authScope.registerGetter({} as any)).toThrowError(
        'Expected `getterFunction` to be a function'
      );
    });

    it('only calls the passed function when #getForRequestAndUser() is called', async () => {
      const authScope = new AuthScopeService();

      const stub = sinon.stub();
      authScope.registerGetter(stub);
      sinon.assert.notCalled(stub);

      const request = requestFixture();
      const user = {} as AuthenticatedUser;
      await authScope.getForRequestAndUser(request, user);
      sinon.assert.calledOnce(stub);
      sinon.assert.calledWithExactly(stub, request, user);
    });
  });

  describe('#getForRequestAndUser()', () => {
    it('throws when request and user are not objects', async () => {
      const authScope = new AuthScopeService();

      await expect(authScope.getForRequestAndUser(null as any, {} as any)).rejects.toThrowError(
        'getCredentialsScope() requires a request object'
      );
      await expect(authScope.getForRequestAndUser(1 as any, {} as any)).rejects.toThrowError(
        'getCredentialsScope() requires a request object'
      );
      await expect(authScope.getForRequestAndUser('abc' as any, {} as any)).rejects.toThrowError(
        'getCredentialsScope() requires a request object'
      );

      await expect(authScope.getForRequestAndUser({} as any, null as any)).rejects.toThrowError(
        'getCredentialsScope() requires a user object'
      );
      await expect(authScope.getForRequestAndUser({} as any, 1 as any)).rejects.toThrowError(
        'getCredentialsScope() requires a user object'
      );
      await expect(authScope.getForRequestAndUser({} as any, 'abc' as any)).rejects.toThrowError(
        'getCredentialsScope() requires a user object'
      );
    });

    it('returns a promise for an empty array by default', async () => {
      const authScope = new AuthScopeService();
      const scope = await authScope.getForRequestAndUser(requestFixture(), {} as any);
      expect(scope).toEqual([]);
    });

    it('calls each registered getter once each call', async () => {
      const authScope = new AuthScopeService();
      const user = {} as any;
      const request = requestFixture();
      const getter1 = sinon.stub();
      const getter2 = sinon.stub();
      const getter3 = sinon.stub();

      authScope.registerGetter(getter1);
      authScope.registerGetter(getter2);
      authScope.registerGetter(getter3);

      await authScope.getForRequestAndUser(request, user);
      sinon.assert.calledOnce(getter1);
      sinon.assert.calledOnce(getter2);
      sinon.assert.calledOnce(getter3);

      await authScope.getForRequestAndUser(request, user);
      sinon.assert.calledTwice(getter1);
      sinon.assert.calledTwice(getter2);
      sinon.assert.calledTwice(getter3);

      await authScope.getForRequestAndUser(request, user);
      sinon.assert.calledThrice(getter1);
      sinon.assert.calledThrice(getter2);
      sinon.assert.calledThrice(getter3);
    });

    it('casts the return value of the getters to an produce a flat, unique array', async () => {
      const authScope = new AuthScopeService();
      authScope.registerGetter(() => undefined as any);
      authScope.registerGetter(() => null as any);
      authScope.registerGetter(() => ['foo', undefined, 'bar'] as any);
      authScope.registerGetter(() => ['foo', 'foo1', 'foo2']);
      authScope.registerGetter(() => 'bar2');

      expect(await authScope.getForRequestAndUser(requestFixture(), {} as any)).toEqual([
        'foo',
        'bar',
        'foo1',
        'foo2',
        'bar2',
      ]);
    });
  });
});
