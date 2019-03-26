/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getTelemetry, incrementCounts, updateTelemetry } from './telemetry';

let server: any;
let callWithInternalUser: any;
let internalRepository: any;

function mockInit(getVal: any = null): void {
  internalRepository = {
    get: jest.fn(() => getVal),
    create: jest.fn(() => ({ attributes: 'test' })),
    update: jest.fn(() => ({ attributes: 'test' })),
  };
  callWithInternalUser = jest.fn();
  server = {
    savedObjects: {
      getSavedObjectsRepository: jest.fn(() => internalRepository),
    },
    plugins: {
      elasticsearch: {
        getCluster: jest.fn(() => ({ callWithInternalUser })),
      },
    },
  };
}

describe('file upload plugin telemetry', () => {
  describe('getTelemetry', () => {
    it('should create new telemetry if no telemetry exists', async () => {
      mockInit();
      await getTelemetry(server, internalRepository);
      // Expect internalRepository.get to get called
      expect(internalRepository.get.mock.calls.length).toBe(1);
      // Expect internalRepository.create to get called
      expect(internalRepository.create.mock.calls.length).toBe(1);
    });

    it('should get existing telemetry', async () => {
      mockInit({});
      await getTelemetry(server, internalRepository);
      // Expect internalRepository.get to get called
      expect(internalRepository.get.mock.calls.length).toBe(1);
      // Expect internalRepository.create NOT to get called
      expect(internalRepository.create.mock.calls.length).toBe(0);
    });
  });

  describe('updateTelemetry', () => {
    it('total count should equal sum of all file counts', async () => {
      mockInit({
        attributes: {
          filesUploadedTotalCount: 2,
        },
      });
      await updateTelemetry({ server, internalRepo: internalRepository });
      expect(internalRepository.update.mock.calls.length).toBe(1);
      // Expect internalRepository.get to get called
      expect(internalRepository.get.mock.calls.length).toBe(2);
      // Expect internalRepository.create to get called
      expect(internalRepository.create.mock.calls.length).toBe(0);
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
      const newCounts = incrementCounts({ app, fileType, ...oldCounts });
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
      const newCounts = incrementCounts({ app, fileType, ...oldCounts });
      const fileAppCounts =
        newCounts.filesUploadedByApp.maps.json +
        newCounts.filesUploadedByApp.maps.csv +
        newCounts.filesUploadedByApp.ml.csv;
      expect(newCounts.filesUploadedTotalCount).toEqual(fileAppCounts);
    });
  });
});
