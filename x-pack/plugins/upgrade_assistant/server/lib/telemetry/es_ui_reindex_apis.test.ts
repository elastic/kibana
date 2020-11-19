/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { savedObjectsRepositoryMock } from 'src/core/server/mocks';
import { UPGRADE_ASSISTANT_DOC_ID, UPGRADE_ASSISTANT_TYPE } from '../../../common/types';
import { upsertUIReindexOption } from './es_ui_reindex_apis';

/**
 * Since these route callbacks are so thin, these serve simply as integration tests
 * to ensure they're wired up to the lib functions correctly. Business logic is tested
 * more thoroughly in the lib/telemetry tests.
 */
describe('Upgrade Assistant Telemetry SavedObject UIReindex', () => {
  describe('Upsert UIReindex Option', () => {
    it('call saved objects internal repository with the correct info', async () => {
      const internalRepo = savedObjectsRepositoryMock.create();
      await upsertUIReindexOption({
        close: true,
        open: true,
        start: true,
        stop: true,
        savedObjects: { createInternalRepository: () => internalRepo } as any,
      });

      expect(internalRepo.incrementCounter).toHaveBeenCalledTimes(4);
      expect(internalRepo.incrementCounter).toHaveBeenCalledWith(
        UPGRADE_ASSISTANT_TYPE,
        UPGRADE_ASSISTANT_DOC_ID,
        `ui_reindex.close`
      );
      expect(internalRepo.incrementCounter).toHaveBeenCalledWith(
        UPGRADE_ASSISTANT_TYPE,
        UPGRADE_ASSISTANT_DOC_ID,
        `ui_reindex.open`
      );
      expect(internalRepo.incrementCounter).toHaveBeenCalledWith(
        UPGRADE_ASSISTANT_TYPE,
        UPGRADE_ASSISTANT_DOC_ID,
        `ui_reindex.start`
      );
      expect(internalRepo.incrementCounter).toHaveBeenCalledWith(
        UPGRADE_ASSISTANT_TYPE,
        UPGRADE_ASSISTANT_DOC_ID,
        `ui_reindex.stop`
      );
    });
  });
});
