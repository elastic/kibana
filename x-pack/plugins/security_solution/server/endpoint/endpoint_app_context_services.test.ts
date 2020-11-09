/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { httpServerMock } from '../../../../../src/core/server/mocks';
import { EndpointAppContextService } from './endpoint_app_context_services';

describe('test endpoint app context services', () => {
  it('should return undefined on getAgentService if dependencies are not enabled', async () => {
    const endpointAppContextService = new EndpointAppContextService();
    expect(endpointAppContextService.getAgentService()).toEqual(undefined);
  });
  it('should return undefined on getManifestManager if dependencies are not enabled', async () => {
    const endpointAppContextService = new EndpointAppContextService();
    expect(endpointAppContextService.getManifestManager()).toEqual(undefined);
  });
  it('should throw error on getScopedSavedObjectsClient if start is not called', async () => {
    const endpointAppContextService = new EndpointAppContextService();
    expect(() =>
      endpointAppContextService.getScopedSavedObjectsClient(httpServerMock.createKibanaRequest())
    ).toThrow(Error);
  });
});
