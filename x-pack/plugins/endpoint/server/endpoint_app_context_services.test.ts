/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { EndpointAppContextService } from './endpoint_app_context_services';

describe('test endpoint app context services', () => {
  it('should throw error if start is not called', async () => {
    const endpointAppContextService = new EndpointAppContextService();
    expect(() => endpointAppContextService.getIndexPatternRetriever()).toThrow(Error);
    expect(() => endpointAppContextService.getAgentService()).toThrow(Error);
  });
});
