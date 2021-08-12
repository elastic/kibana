/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  createEndpointMetadataServiceTestContextMock,
  EndpointMetadataServiceTestContextMock,
} from './mocks';

describe('EndpointMetadataService', () => {
  let testMockedContext: EndpointMetadataServiceTestContextMock;

  beforeEach(() => {
    testMockedContext = createEndpointMetadataServiceTestContextMock();
  });

  describe('#findHostMetadataForFleetAgents()', () => {
    it.todo('should call elasticsearch with proper filter');

    it.todo('should return a wrapped elasticsearch Error when one occurs');

    it.todo('should return an array of Host Metadata documents');
  });
});
