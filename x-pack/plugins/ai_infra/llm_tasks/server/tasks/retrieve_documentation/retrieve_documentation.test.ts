/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock } from '@kbn/core/server/mocks';
import { loggerMock, type MockedLogger } from '@kbn/logging-mocks';
import { retrieveDocumentation } from './retrieve_documentation';

describe('retrieveDocumentation', () => {
  let logger: MockedLogger;
  let outputAPI: jest.Mock;
  let searchDocAPI: jest.Mock;
  let retrieve: ReturnType<typeof retrieveDocumentation>;

  beforeEach(() => {
    logger = loggerMock.create();
    outputAPI = jest.fn();
    searchDocAPI = jest.fn();
    retrieve = retrieveDocumentation({ logger, searchDocAPI, outputAPI });
  });

  it('calls the search API with the right parameters', async () => {
    searchDocAPI.mockResolvedValue({ results: [] });
    const request = httpServerMock.createKibanaRequest();

    const result = await retrieve({
      searchTerm: 'What is Kibana?',
      products: ['kibana'],
      request,
      max: 5,
      connectorId: '.my-connector',
      functionCalling: 'simulated',
    });

    expect(result).toEqual({
      success: true,
      documents: [],
    });

    expect(searchDocAPI).toHaveBeenCalledTimes(1);
    expect(searchDocAPI).toHaveBeenCalledWith({
      query: 'What is Kibana?',
      products: ['kibana'],
      max: 5,
    });
  });
});
