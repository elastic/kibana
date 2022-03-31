/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  loggingSystemMock,
  savedObjectsRepositoryMock,
} from '../../../../../../src/core/server/mocks';
import { getConfigurationTelemetryData } from './configuration';

describe('configuration', () => {
  describe('getConfigurationTelemetryData', () => {
    const logger = loggingSystemMock.createLogger();
    const savedObjectsClient = savedObjectsRepositoryMock.create();
    savedObjectsClient.find.mockResolvedValue({
      total: 5,
      saved_objects: [],
      per_page: 1,
      page: 1,
      aggregations: {
        closureType: {
          buckets: [
            { doc_count: 1, key: 'close-by-user' },
            { doc_count: 2, key: 'close-by-pushing' },
          ],
        },
      },
    });

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('it returns the correct res', async () => {
      const res = await getConfigurationTelemetryData({ savedObjectsClient, logger });
      expect(res).toEqual({
        all: {
          closure: {
            manually: 1,
            automatic: 2,
          },
        },
      });
    });

    it('should call find with correct arguments', async () => {
      await getConfigurationTelemetryData({ savedObjectsClient, logger });
      expect(savedObjectsClient.find).toBeCalledWith({
        aggs: {
          closureType: {
            terms: {
              field: 'cases-configure.attributes.closure_type',
            },
          },
        },
        filter: undefined,
        page: 0,
        perPage: 0,
        type: 'cases-configure',
      });
    });
  });
});
