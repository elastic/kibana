/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Readable } from 'stream';
import { createPromiseFromStreams, createConcatStream } from 'src/legacy/utils/streams';
import { SavedObjectsSchema, SavedObjectsLegacyService } from 'src/core/server';
import { LegacyAPI } from '../../../plugin';
import { Space } from '../../../../common/model/space';
import { createSpaces } from '.';

async function readStreamToCompletion(stream: Readable) {
  return (await (createPromiseFromStreams([stream, createConcatStream([])]) as unknown)) as any[];
}

interface LegacyAPIOpts {
  spaces?: Space[];
}

export const createLegacyAPI = ({
  spaces = createSpaces().map(s => ({ id: s.id, ...s.attributes })),
}: LegacyAPIOpts = {}) => {
  const mockSavedObjectsClientContract = {
    get: jest.fn((type, id) => {
      const result = spaces.filter(s => s.id === id);
      if (!result.length) {
        throw new Error(`not found: [${type}:${id}]`);
      }
      return result[0];
    }),
    find: jest.fn(() => {
      return {
        total: spaces.length,
        saved_objects: spaces,
      };
    }),
    create: jest.fn((type, attributes, { id }) => {
      if (spaces.find(s => s.id === id)) {
        throw new Error('conflict');
      }
      return {};
    }),
    update: jest.fn((type, id) => {
      if (!spaces.find(s => s.id === id)) {
        throw new Error('not found: during update');
      }
      return {};
    }),
    delete: jest.fn((type: string, id: string) => {
      return {};
    }),
    deleteByNamespace: jest.fn(),
  };

  const savedObjectsService = ({
    types: ['visualization', 'dashboard', 'index-pattern', 'globalType'],
    schema: new SavedObjectsSchema({
      space: {
        isNamespaceAgnostic: true,
        hidden: true,
      },
      globalType: {
        isNamespaceAgnostic: true,
      },
    }),
    getScopedSavedObjectsClient: jest.fn().mockResolvedValue(mockSavedObjectsClientContract),
    importExport: {
      objectLimit: 10000,
      getSortedObjectsForExport: jest.fn().mockResolvedValue(
        new Readable({
          objectMode: true,
          read() {
            this.push(null);
          },
        })
      ),
      importSavedObjects: jest.fn().mockImplementation(async (opts: Record<string, any>) => {
        const objectsToImport: any[] = await readStreamToCompletion(opts.readStream);
        return {
          success: true,
          successCount: objectsToImport.length,
        };
      }),
      resolveImportErrors: jest.fn().mockImplementation(async (opts: Record<string, any>) => {
        const objectsToImport: any[] = await readStreamToCompletion(opts.readStream);
        return {
          success: true,
          successCount: objectsToImport.length,
        };
      }),
    },
    SavedObjectsClient: {
      errors: {
        isNotFoundError: jest.fn((e: any) => e.message.startsWith('not found:')),
        isConflictError: jest.fn((e: any) => e.message.startsWith('conflict')),
      },
    },
  } as unknown) as jest.Mocked<SavedObjectsLegacyService>;

  const legacyAPI: jest.Mocked<LegacyAPI> = {
    legacyConfig: {
      kibanaIndex: '',
    },
    auditLogger: {} as any,
    savedObjects: savedObjectsService,
  };

  return legacyAPI;
};
