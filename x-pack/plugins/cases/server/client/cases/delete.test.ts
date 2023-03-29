/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { FindFileArgs } from '@kbn/files-plugin/server';
import { createFileServiceMock } from '@kbn/files-plugin/server/mocks';
import type { FileJSON } from '@kbn/shared-ux-file-types';
import { constructFileKindIdByOwner } from '../../../common/files';
import { MAX_FILES_PER_CASE } from '../../files';
import { getFileEntities } from './delete';

interface CaseMeta {
  caseIds: string[];
}

describe('delete', () => {
  describe('getFileEntities', () => {
    const mockFileService = createFileServiceMock();
    mockFileService.find.mockImplementation(async (args: FindFileArgs) => {
      // TODO: switch this to CaseFileMetadata
      const caseMeta = args.meta as unknown as CaseMeta;
      const numFilesToGen = caseMeta.caseIds.length * MAX_FILES_PER_CASE;
      const files = Array.from(Array(numFilesToGen).keys()).map(() => createMockFileJSON());

      return {
        files,
        total: files.length,
      };
    });

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('only provides 50 case ids in a single call to the find api', async () => {
      const numCaseIds = 1000;
      const caseIds = getCaseIds(numCaseIds);
      const entities = await getFileEntities(caseIds, mockFileService);

      const chunkSize = 50;

      for (const call of mockFileService.find.mock.calls) {
        const callMeta = call[0].meta as unknown as CaseMeta;
        expect(callMeta.caseIds.length).toEqual(50);
      }

      expect(mockFileService.find).toHaveBeenCalledTimes(numCaseIds / chunkSize);
      expect(entities.length).toEqual(numCaseIds * MAX_FILES_PER_CASE);
    });

    it('calls the find function the number of case ids divided by the chunk size', async () => {
      const numCaseIds = 1000;
      const caseIds = getCaseIds(numCaseIds);
      const entities = await getFileEntities(caseIds, mockFileService);

      const chunkSize = 50;

      expect(mockFileService.find).toHaveBeenCalledTimes(numCaseIds / chunkSize);
      expect(entities.length).toEqual(numCaseIds * MAX_FILES_PER_CASE);
    });

    it('returns the number of entities equal to the case ids times the max files per case limit', async () => {
      const numCaseIds = 1000;
      const caseIds = getCaseIds(numCaseIds);
      const entities = await getFileEntities(caseIds, mockFileService);

      expect(entities.length).toEqual(numCaseIds * MAX_FILES_PER_CASE);
    });
  });
});

const createMockFileJSON = (): FileJSON => {
  return {
    id: '123',
    fileKind: constructFileKindIdByOwner('securitySolution'),
    meta: {
      owner: ['securitySolution'],
    },
  } as unknown as FileJSON;
};

const getCaseIds = (numIds: number) => {
  return Array.from(Array(numIds).keys()).map((key) => key.toString());
};
