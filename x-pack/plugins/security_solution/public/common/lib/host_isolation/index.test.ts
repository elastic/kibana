/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { KibanaServices } from '../kibana';
import { coreMock } from '../../../../../../../src/core/public/mocks';
import { HostIsolationRequestBody } from '../../../../common/endpoint/types';
import { isolateHost, unIsolateHost } from './index';
import { ISOLATE_HOST_ROUTE, UNISOLATE_HOST_ROUTE } from '../../../../common/endpoint/constants';

jest.mock('../kibana');

describe('When using Host Isolation library', () => {
  const mockKibanaServices = KibanaServices.get as jest.Mock;
  const generateActionPayloadMock = (): HostIsolationRequestBody => {
    return {
      agent_ids: ['fd8a122b-4c54-4c05-b295-111'],
      endpoint_ids: ['88c04a90-b19c-11eb-b838-222'],
      alert_ids: ['88c04a90-b19c-11eb-b838-333'],
      case_ids: ['88c04a90-b19c-11eb-b838-444'],
      comment: 'Lock it',
    };
  };

  beforeEach(() => {
    mockKibanaServices.mockReturnValue(coreMock.createStart({ basePath: '/mock' }));
  });

  it('should send an isolate POST request', async () => {
    const requestBody = generateActionPayloadMock();
    await isolateHost(requestBody);

    expect(mockKibanaServices().http.post).toHaveBeenCalledWith(ISOLATE_HOST_ROUTE, {
      body: JSON.stringify(requestBody),
    });
  });

  it('should send an un-isolate POST request', async () => {
    const requestBody = generateActionPayloadMock();
    await unIsolateHost(requestBody);

    expect(mockKibanaServices().http.post).toHaveBeenCalledWith(UNISOLATE_HOST_ROUTE, {
      body: JSON.stringify(requestBody),
    });
  });
});
