/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getTelemetry, incrementCounts, updateTelemetry } from './telemetry';

const internalRepository = () => ({
  get: jest.fn(() => null),
  create: jest.fn(() => ({ attributes: 'test' })),
  update: jest.fn(() => ({ attributes: 'test' })),
});
const server: any = {
  savedObjects: {
    getSavedObjectsRepository: jest.fn(() => internalRepository()),
  },
  plugins: {
    elasticsearch: {
      getCluster: jest.fn(() => ({ callWithInternalUser })),
    },
  },
};
const callWithInternalUser = jest.fn();

function mockInit(getVal: any = { attributes: {} }): any {
  return {
    ...internalRepository(),
    get: jest.fn(() => getVal),
  };
}

describe('file upload plugin telemetry', () => {
  describe('getTelemetry', () => {
    it('should create new telemetry if no telemetry exists', async () => {
      const internalRepo = mockInit({});
      await getTelemetry(server, internalRepo);
      expect(internalRepo.get.mock.calls.length).toBe(1);
      expect(internalRepo.create.mock.calls.length).toBe(1);
    });

    it('should get existing telemetry', async () => {
      const internalRepo = mockInit();
      await getTelemetry(server, internalRepo);
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
      await updateTelemetry({ server, internalRepo });
      expect(internalRepo.update.mock.calls.length).toBe(1);
      expect(internalRepo.get.mock.calls.length).toBe(1);
      expect(internalRepo.create.mock.calls.length).toBe(0);
    });
  });

  describe('incrementCounts', () => {
    const oldCounts = {
      filesUploadedTotalCount: 3,
      filesUploadedTypesTotalCounts: {
        json: 1,
        csv: 2,
      },
      filesUploadedByApp: {
        maps: {
          json: 1,
          csv: 1,
        },
        ml: {
          csv: 1,
        },
      },
    };
    const app = 'maps';
    const fileType = 'json';

    it('app, file and total count should increment by 1', async () => {
      const newCounts: any = incrementCounts({ app, fileType, ...oldCounts });
      expect(newCounts.filesUploadedTotalCount).toEqual(4);
      expect(newCounts.filesUploadedTypesTotalCounts[fileType]).toEqual(2);
      expect(newCounts.filesUploadedByApp[app][fileType]).toEqual(2);
    });

    it('total count should equal sum of all file type counts', async () => {
      const newCounts = incrementCounts({ app, fileType, ...oldCounts });
      const fileTypeCounts =
        newCounts.filesUploadedTypesTotalCounts.json + newCounts.filesUploadedTypesTotalCounts.csv;
      expect(newCounts.filesUploadedTotalCount).toEqual(fileTypeCounts);
    });

    it('total count should equal sum of all app counts', async () => {
      const newCounts: any = incrementCounts({ app, fileType, ...oldCounts });
      const fileAppCounts =
        newCounts.filesUploadedByApp.maps.json +
        newCounts.filesUploadedByApp.maps.csv +
        newCounts.filesUploadedByApp.ml.csv;
      expect(newCounts.filesUploadedTotalCount).toEqual(fileAppCounts);
    });
  });
});
