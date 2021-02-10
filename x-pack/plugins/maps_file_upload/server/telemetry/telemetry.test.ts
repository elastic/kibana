/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getTelemetry, updateTelemetry } from './telemetry';

const internalRepository = () => ({
  get: jest.fn(() => null),
  create: jest.fn(() => ({ attributes: 'test' })),
  update: jest.fn(() => ({ attributes: 'test' })),
});

function mockInit(getVal: any = { attributes: {} }): any {
  return {
    ...internalRepository(),
    get: jest.fn(() => getVal),
  };
}

describe('file upload plugin telemetry', () => {
  describe('getTelemetry', () => {
    it('should get existing telemetry', async () => {
      const internalRepo = mockInit();
      await getTelemetry(internalRepo);
      expect(internalRepo.update.mock.calls.length).toBe(0);
      expect(internalRepo.get.mock.calls.length).toBe(1);
      expect(internalRepo.create.mock.calls.length).toBe(0);
    });
  });

  describe('updateTelemetry', () => {
    it('should update existing telemetry', async () => {
      const internalRepo = mockInit({
        attributes: {
          filesUploadedTotalCount: 2,
        },
      });

      await updateTelemetry(internalRepo);
      expect(internalRepo.update.mock.calls.length).toBe(1);
      expect(internalRepo.get.mock.calls.length).toBe(1);
      expect(internalRepo.create.mock.calls.length).toBe(0);
    });
  });
});
