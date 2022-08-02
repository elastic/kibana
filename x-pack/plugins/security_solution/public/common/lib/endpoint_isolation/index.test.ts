/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { KibanaServices } from '../kibana';
import { coreMock } from '@kbn/core/public/mocks';
import { isolateHost, unIsolateHost } from '.';
import { ISOLATE_HOST_ROUTE, UNISOLATE_HOST_ROUTE } from '../../../../common/endpoint/constants';
import { hostIsolationRequestBodyMock } from './mocks';

jest.mock('../kibana');

describe('When using Host Isolation library', () => {
  const mockKibanaServices = KibanaServices.get as jest.Mock;

  beforeEach(() => {
    mockKibanaServices.mockReturnValue(coreMock.createStart({ basePath: '/mock' }));
  });

  it('should send an isolate POST request', async () => {
    const requestBody = hostIsolationRequestBodyMock();
    await isolateHost(requestBody);

    expect(mockKibanaServices().http.post).toHaveBeenCalledWith(ISOLATE_HOST_ROUTE, {
      body: JSON.stringify(requestBody),
    });
  });

  it('should send an un-isolate POST request', async () => {
    const requestBody = hostIsolationRequestBodyMock();
    await unIsolateHost(requestBody);

    expect(mockKibanaServices().http.post).toHaveBeenCalledWith(UNISOLATE_HOST_ROUTE, {
      body: JSON.stringify(requestBody),
    });
  });
});
