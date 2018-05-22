/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import ngMock from 'ng_mock';
import sinon from 'sinon';
import { Notifier } from 'ui/notify';

const XPACK_INFO_SIG_KEY = 'xpackMain.infoSignature';
const XPACK_INFO_KEY = 'xpackMain.info';

describe('CheckXPackInfoChange Factory', () => {
  const sandbox = sinon.createSandbox();

  let mockSessionStorage;
  beforeEach(ngMock.module('kibana', ($provide) => {
    mockSessionStorage = sinon.stub({
      setItem() {},
      getItem() {},
      removeItem() {}
    });

    mockSessionStorage.getItem.withArgs(XPACK_INFO_SIG_KEY).returns('foo');

    $provide.service('$window', () => ({
      sessionStorage: mockSessionStorage,
      location: { pathname: '' }
    }));
  }));

  let $http;
  let $httpBackend;
  let $timeout;
  beforeEach(ngMock.inject(($injector) => {
    $http = $injector.get('$http');
    $httpBackend = $injector.get('$httpBackend');
    $timeout = $injector.get('$timeout');

    // We set 'kbn-system-api' to not trigger other unrelated toast notifications
    // like the one related to the session expiration.
    $http.defaults.headers.common['kbn-system-api'] = 'x';

    sandbox.stub(Notifier.prototype, 'directive');
  }));

  afterEach(function () {
    $httpBackend.verifyNoOutstandingRequest();
    $timeout.verifyNoPendingTasks();

    sandbox.restore();
  });

  it('does not show "license expired" banner if license is not expired.', () => {
    const license = { license: { isActive: true, type: 'x-license' } };
    mockSessionStorage.getItem.withArgs(XPACK_INFO_KEY).returns(JSON.stringify(license));

    $httpBackend
      .when('POST', '/api/test')
      .respond('ok', { 'kbn-xpack-sig': 'foo' });

    $httpBackend
      .when('GET', '/api/xpack/v1/info')
      .respond(license, { 'kbn-xpack-sig': 'foo' });

    $http.post('/api/test');
    $httpBackend.flush();
    $timeout.flush();

    sinon.assert.notCalled(Notifier.prototype.directive);
  });

  it('shows "license expired" banner if license is expired only once.', async () => {
    const license = { license: { isActive: false, type: 'diamond' } };
    mockSessionStorage.getItem.withArgs(XPACK_INFO_KEY).returns(JSON.stringify(license));

    $httpBackend
      .when('POST', '/api/test')
      .respond('ok', { 'kbn-xpack-sig': 'bar' });

    $httpBackend
      .when('GET', '/api/xpack/v1/info')
      .respond(license, { 'kbn-xpack-sig': 'bar' });

    $http.post('/api/test');
    $httpBackend.flush();
    $timeout.flush();

    sinon.assert.calledOnce(Notifier.prototype.directive);
    sinon.assert.calledWithExactly(Notifier.prototype.directive, {
      template: sinon.match('Your diamond license is currently expired')
    }, {
      type: 'error'
    });

    // If license didn't change banner shouldn't be displayed.
    Notifier.prototype.directive.resetHistory();
    mockSessionStorage.getItem.withArgs(XPACK_INFO_SIG_KEY).returns('bar');

    $http.post('/api/test');
    $httpBackend.flush();
    $timeout.flush();

    sinon.assert.notCalled(Notifier.prototype.directive);
  });
});
