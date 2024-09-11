/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Logger } from '@kbn/core/server';

import { addRequiredKbResourceMetadata } from './add_required_kb_resource_metadata';
import { ElasticsearchStore } from '../elasticsearch_store/elasticsearch_store';
import { loadESQL } from './esql_loader';
import {
  mockEsqlDocsFromDirectoryLoader,
  mockEsqlLanguageDocsFromDirectoryLoader,
  mockExampleQueryDocsFromDirectoryLoader,
} from '../../../__mocks__/docs_from_directory_loader';
import { ESQL_RESOURCE } from '../../../routes/knowledge_base/constants';

let mockLoad = jest.fn();

jest.mock('langchain/document_loaders/fs/directory', () => ({
  DirectoryLoader: jest.fn().mockImplementation(() => ({
    load: mockLoad,
  })),
}));

jest.mock('langchain/document_loaders/fs/text', () => ({
  TextLoader: jest.fn().mockImplementation(() => ({})),
}));

const esStore = {
  addDocuments: jest.fn().mockResolvedValue(['1', '2', '3', '4', '5']),
} as unknown as ElasticsearchStore;

const logger = {
  info: jest.fn(),
  error: jest.fn(),
} as unknown as Logger;

describe('loadESQL', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    mockLoad = jest
      .fn()
      .mockReturnValueOnce(mockEsqlDocsFromDirectoryLoader)
      .mockReturnValueOnce(mockEsqlLanguageDocsFromDirectoryLoader)
      .mockReturnValueOnce(mockExampleQueryDocsFromDirectoryLoader);
  });

  describe('loadESQL', () => {
    beforeEach(async () => {
      await loadESQL(esStore, logger);
    });

    it('loads ES|QL docs, language files, and example queries into the Knowledge Base', async () => {
      expect(esStore.addDocuments).toHaveBeenCalledWith([
        ...addRequiredKbResourceMetadata({
          docs: mockEsqlDocsFromDirectoryLoader,
          kbResource: ESQL_RESOURCE,
          required: false,
        }),
        ...addRequiredKbResourceMetadata({
          docs: mockEsqlLanguageDocsFromDirectoryLoader,
          kbResource: ESQL_RESOURCE,
          required: false,
        }),
        ...addRequiredKbResourceMetadata({
          docs: mockExampleQueryDocsFromDirectoryLoader,
          kbResource: ESQL_RESOURCE,
        }),
      ]);
    });

    it('logs the expected (distinct) counts for each category of documents', async () => {
      expect((logger.info as jest.Mock).mock.calls[0][0]).toEqual(
        'Loading 1 ES|QL docs, 2 language docs, and 3 example queries into the Knowledge Base'
      );
    });

    it('logs the expected total of all documents loaded', async () => {
      expect((logger.info as jest.Mock).mock.calls[1][0]).toEqual(
        'Loaded 5 ES|QL docs, language docs, and example queries into the Knowledge Base'
      );
    });

    it('does NOT log an error in the happy path', async () => {
      expect(logger.error).not.toHaveBeenCalled();
    });
  });

  it('returns true if documents were loaded', async () => {
    (esStore.addDocuments as jest.Mock).mockResolvedValueOnce(['this is a response']);

    const result = await loadESQL(esStore, logger);

    expect(result).toBe(true);
  });

  it('returns false if documents were NOT loaded', async () => {
    (esStore.addDocuments as jest.Mock).mockResolvedValueOnce([]);

    const result = await loadESQL(esStore, logger);

    expect(result).toBe(false);
  });

  it('logs the expected error if loading fails', async () => {
    const error = new Error('Failed to load documents');
    (esStore.addDocuments as jest.Mock).mockRejectedValueOnce(error);

    await loadESQL(esStore, logger);

    expect(logger.error).toHaveBeenCalledWith(
      'Failed to load ES|QL docs, language docs, and example queries into the Knowledge Base\nError: Failed to load documents'
    );
  });
});
