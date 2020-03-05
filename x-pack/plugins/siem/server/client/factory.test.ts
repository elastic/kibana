/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { httpServerMock } from '../../../../../src/core/server/mocks';
import { SiemClientFactory } from './factory';
import { SiemClient } from './client';
import { createMockConfig } from '../lib/detection_engine/routes/__mocks__';

jest.mock('./client');
const mockClient = SiemClient as jest.Mock;

describe('SiemClientFactory', () => {
  let mockConfig: ReturnType<typeof createMockConfig>;

  beforeEach(() => {
    mockConfig = createMockConfig();
  });

  describe('#create', () => {
    it('constructs a client with the current spaceId', () => {
      const factory = new SiemClientFactory();
      const mockRequest = httpServerMock.createKibanaRequest();
      factory.setup({ getSpaceId: () => 'mockSpace', config: mockConfig });
      factory.create(mockRequest);

      expect(mockClient).toHaveBeenCalledWith('mockSpace', mockConfig);
    });

    it('constructs a client with the default spaceId if spaces are disabled', () => {
      const factory = new SiemClientFactory();
      const mockRequest = httpServerMock.createKibanaRequest();
      factory.setup({ getSpaceId: undefined, config: mockConfig });
      factory.create(mockRequest);

      expect(mockClient).toHaveBeenCalledWith('default', expect.anything());
    });

    it('cannot call create without calling setup first', () => {
      const factory = new SiemClientFactory();
      const mockRequest = httpServerMock.createKibanaRequest();
      expect(() => factory.create(mockRequest)).toThrow(
        'Cannot create SiemClient as config is not present. Did you forget to call setup()?'
      );
    });
  });
});
