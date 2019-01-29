/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { UPGRADE_ASSISTANT_DOC_ID, UPGRADE_ASSISTANT_TYPE } from '../../../common/types';
import { upsertUIReindexOption } from './es_ui_reindex_apis';

/**
 * Since these route callbacks are so thin, these serve simply as integration tests
 * to ensure they're wired up to the lib functions correctly. Business logic is tested
 * more thoroughly in the lib/telemetry tests.
 */
describe('Upgrade Assistant Telemetry SavedObject UIReindex', () => {
  const mockIncrementCounter = jest.fn();
  const server = jest.fn().mockReturnValue({
    usage: {
      collectorSet: {
        makeUsageCollector: {},
        register: {},
      },
    },
    savedObjects: {
      getSavedObjectsRepository: jest.fn().mockImplementation(() => {
        return {
          incrementCounter: mockIncrementCounter,
        };
      }),
    },
    plugins: {
      elasticsearch: {
        getCluster: () => {
          return {
            callWithInternalUser: {},
          };
        },
      },
    },
  });

  const request = jest.fn().mockReturnValue({
    payload: {
      start: true,
      cancel: true,
    },
  });

  describe('Upsert UIReindex Option', () => {
    it('call saved objects internal repository with the correct info', async () => {
      const serverMock = server();
      const incCounterSORepoFunc = serverMock.savedObjects.getSavedObjectsRepository()
        .incrementCounter;

      await upsertUIReindexOption(serverMock, request());

      expect(incCounterSORepoFunc).toHaveBeenCalledTimes(2);
      expect(incCounterSORepoFunc).toHaveBeenCalledWith(
        UPGRADE_ASSISTANT_TYPE,
        UPGRADE_ASSISTANT_DOC_ID,
        `ui_reindex.start`
      );
      expect(incCounterSORepoFunc).toHaveBeenCalledWith(
        UPGRADE_ASSISTANT_TYPE,
        UPGRADE_ASSISTANT_DOC_ID,
        `ui_reindex.cancel`
      );
    });
  });
});
