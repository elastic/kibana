/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { httpServerMock } from '../../../../../src/core/server/mocks';
import { createMockConfig } from '../lib/detection_engine/routes/__mocks__';
import { AppClientFactory } from './factory';
import { AppClient } from './client';

jest.mock('./client');
const mockClient = AppClient as jest.Mock;

describe('AppClientFactory', () => {
  describe('#create', () => {
    it('constructs a client with the current spaceId', () => {
      const factory = new AppClientFactory();
      const mockRequest = httpServerMock.createKibanaRequest();
      factory.setup({ getSpaceId: () => 'mockSpace', config: createMockConfig() });
      factory.create(mockRequest);

      expect(mockClient).toHaveBeenCalledWith('mockSpace', expect.anything());
    });

    it('constructs a client with the default spaceId if spaces are disabled', () => {
      const factory = new AppClientFactory();
      const mockRequest = httpServerMock.createKibanaRequest();
      factory.setup({ getSpaceId: undefined, config: createMockConfig() });
      factory.create(mockRequest);

      expect(mockClient).toHaveBeenCalledWith('default', expect.anything());
    });

    it('cannot call create without calling setup first', () => {
      const factory = new AppClientFactory();
      const mockRequest = httpServerMock.createKibanaRequest();
      expect(() => factory.create(mockRequest)).toThrow(
        'Cannot create AppClient as config is not present. Did you forget to call setup()?'
      );
    });
  });
});
