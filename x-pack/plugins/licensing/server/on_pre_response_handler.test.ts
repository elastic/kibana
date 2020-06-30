/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { BehaviorSubject } from 'rxjs';
import { createOnPreResponseHandler } from './on_pre_response_handler';
import { httpServiceMock, httpServerMock } from '../../../../src/core/server/mocks';
import { licenseMock } from '../common/licensing.mock';

describe('createOnPreResponseHandler', () => {
  it('sets license.signature header immediately for non-error responses', async () => {
    const refresh = jest.fn();
    const license$ = new BehaviorSubject(licenseMock.createLicense({ signature: 'foo' }));
    const toolkit = httpServiceMock.createOnPreResponseToolkit();

    const interceptor = createOnPreResponseHandler(refresh, license$);
    await interceptor(httpServerMock.createKibanaRequest(), { statusCode: 200 }, toolkit);

    expect(refresh).toHaveBeenCalledTimes(0);
    expect(toolkit.next).toHaveBeenCalledTimes(1);
    expect(toolkit.next).toHaveBeenCalledWith({
      headers: {
        'kbn-license-sig': 'foo',
      },
    });
  });
  it('sets license.signature header after refresh for non-error responses', async () => {
    const updatedLicense = licenseMock.createLicense({ signature: 'bar' });
    const license$ = new BehaviorSubject(licenseMock.createLicense({ signature: 'foo' }));
    const refresh = jest.fn().mockImplementation(
      () =>
        new Promise((resolve) => {
          setTimeout(() => {
            license$.next(updatedLicense);
            resolve();
          }, 50);
        })
    );

    const toolkit = httpServiceMock.createOnPreResponseToolkit();

    const interceptor = createOnPreResponseHandler(refresh, license$);
    await interceptor(httpServerMock.createKibanaRequest(), { statusCode: 400 }, toolkit);

    expect(refresh).toHaveBeenCalledTimes(1);
    expect(toolkit.next).toHaveBeenCalledTimes(1);
    expect(toolkit.next).toHaveBeenCalledWith({
      headers: {
        'kbn-license-sig': 'bar',
      },
    });
  });
});
