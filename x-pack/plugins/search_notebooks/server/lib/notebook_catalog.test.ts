/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import fs from 'fs/promises';
import type { Logger } from '@kbn/logging';

// Mocking dependencies
jest.mock('fs/promises');
jest.mock('node-fetch');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const fetchMock = require('node-fetch') as jest.Mock;

const mockLogger: Logger = {
  warn: jest.fn(),
  error: jest.fn(),
} as Partial<Logger> as Logger;

import {
  getNotebook,
  getNotebookCatalog,
  DEFAULT_NOTEBOOKS,
  NOTEBOOKS_MAP,
  NotebookCatalogFetchOptions,
  getNotebookMetadata,
} from './notebook_catalog';
import { createNotebooksCache } from '../utils';
import { RemoteNotebookCatalog, SearchNotebooksConfig } from '../config';
import { NotebookDefinition } from '@kbn/ipynb';

const emptyNotebookCache = createNotebooksCache();
const baseConfig: SearchNotebooksConfig = { enabled: true };
const staticOptions: NotebookCatalogFetchOptions = {
  cache: emptyNotebookCache,
  config: baseConfig,
  logger: mockLogger,
};
const dynamicOptions: NotebookCatalogFetchOptions = {
  cache: emptyNotebookCache,
  config: {
    ...baseConfig,
    catalog: {
      url: 'http://localhost:1000/catalog.json',
      ttl: 30,
      errorTTL: 120,
    },
  },
  logger: mockLogger,
};
describe('Notebook Catalog', () => {
  const fakeNow = new Date('1999-12-31T23:59:59.999Z');
  beforeAll(() => {
    jest.useFakeTimers();
    jest.setSystemTime(fakeNow);
  });
  beforeEach(() => {
    // Reset mocks and cache before each test
    jest.resetAllMocks();
    // Reset the notebook cache
    dynamicOptions.cache = createNotebooksCache();
  });

  describe('getNotebookCatalog', () => {
    describe('static notebooks', () => {
      it('returns default notebooks when theres an empty catalog config', async () => {
        await expect(getNotebookCatalog(staticOptions)).resolves.toMatchObject(DEFAULT_NOTEBOOKS);
      });
      it.skip('returns requested list of notebooks when it exists', async () => {
        // Re-enable this with actual list when we implement them
        await expect(
          getNotebookCatalog({ ...staticOptions, notebookList: 'ml' })
        ).resolves.toMatchObject({
          notebooks: [
            NOTEBOOKS_MAP['03_elser'],
            NOTEBOOKS_MAP['02_hybrid_search'],
            NOTEBOOKS_MAP['04_multilingual'],
          ],
        });
      });
      it('returns default list if requested list doesnt exist', async () => {
        await expect(
          getNotebookCatalog({ ...staticOptions, notebookList: 'foo' })
        ).resolves.toMatchObject({
          notebooks: [
            NOTEBOOKS_MAP['00_quick_start'],
            NOTEBOOKS_MAP['01_keyword_querying_filtering'],
            NOTEBOOKS_MAP['02_hybrid_search'],
            NOTEBOOKS_MAP['03_elser'],
            NOTEBOOKS_MAP['04_multilingual'],
          ],
        });
      });
    });

    describe('remote catalog', () => {
      it('fetches catalog from configured URL', async () => {
        const mockCatalog: RemoteNotebookCatalog = {
          notebooks: [
            {
              id: 'unit-test',
              title: 'Test',
              description: 'Test notebook',
              url: 'http://localhost:3000/my_notebook.ipynb',
            },
          ],
        };
        const mockResp = {
          status: 200,
          statusText: 'OK',
          ok: true,
          json: jest.fn().mockResolvedValue(mockCatalog),
        };
        fetchMock.mockResolvedValue(mockResp);
        await expect(getNotebookCatalog(dynamicOptions)).resolves.toEqual({
          notebooks: [
            {
              id: 'unit-test',
              title: 'Test',
              description: 'Test notebook',
            },
          ],
        });

        expect(fetchMock).toHaveBeenCalledTimes(1);
        expect(fetchMock).toHaveBeenCalledWith(dynamicOptions.config.catalog!.url, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        });
      });
      it('caches catalog on fetch', async () => {
        const mockCatalog: RemoteNotebookCatalog = {
          notebooks: [
            {
              id: 'unit-test',
              title: 'Test',
              description: 'Test notebook',
              url: 'http://localhost:3000/my_notebook.ipynb',
            },
          ],
        };
        const mockResp = {
          status: 200,
          statusText: 'OK',
          ok: true,
          json: jest.fn().mockResolvedValue(mockCatalog),
        };
        fetchMock.mockResolvedValue(mockResp);

        await getNotebookCatalog(dynamicOptions);
        expect(dynamicOptions.cache.catalog).toBeDefined();
        expect(dynamicOptions.cache.catalog).toEqual({
          ...mockCatalog,
          timestamp: fakeNow,
        });
      });
      it('defaults to static notebooks if fetch fails with non-200', async () => {
        const mockResp = {
          ok: false,
          status: 404,
          statusText: 'NOT_FOUND',
        };
        fetchMock.mockResolvedValue(mockResp);
        await expect(getNotebookCatalog(dynamicOptions)).resolves.toEqual(DEFAULT_NOTEBOOKS);
      });
      it('defaults to static notebooks if fetch fails with error', async () => {
        fetchMock.mockRejectedValue(new Error('Failed to Fetch'));
        await expect(getNotebookCatalog(dynamicOptions)).resolves.toEqual(DEFAULT_NOTEBOOKS);
      });
      it('defaults to static notebooks if fetch returns invalid catalog', async () => {
        const mockBadCatalog = {
          notebooks: [
            {
              id: 'unit-test',
              title: 'Test',
            },
          ],
        };
        const mockResp = {
          status: 200,
          statusText: 'OK',
          ok: true,
          json: jest.fn().mockResolvedValue(mockBadCatalog),
        };
        fetchMock.mockResolvedValue(mockResp);
        await expect(getNotebookCatalog(dynamicOptions)).resolves.toEqual(DEFAULT_NOTEBOOKS);
      });
      it('returns cached catalog if within TTL', async () => {
        const mockCatalog: RemoteNotebookCatalog = {
          notebooks: [
            {
              id: 'unit-test',
              title: 'Test',
              description: 'Test notebook',
              url: 'http://localhost:3000/my_notebook.ipynb',
            },
          ],
        };
        dynamicOptions.cache.catalog = {
          ...mockCatalog,
          timestamp: new Date('1999-12-31T23:59:58.999Z'),
        };

        await expect(getNotebookCatalog(dynamicOptions)).resolves.toEqual({
          notebooks: [
            {
              id: 'unit-test',
              title: 'Test',
              description: 'Test notebook',
            },
          ],
        });
        expect(fetchMock).toHaveBeenCalledTimes(0);
      });
      it('fetches catalog if cached catalog TTL is expired', async () => {
        const mockCatalog: RemoteNotebookCatalog = {
          notebooks: [
            {
              id: 'unit-test',
              title: 'Test',
              description: 'Test notebook',
              url: 'http://localhost:3000/my_notebook.ipynb',
            },
          ],
        };
        const mockResp = {
          status: 200,
          statusText: 'OK',
          ok: true,
          json: jest.fn().mockResolvedValue(mockCatalog),
        };
        fetchMock.mockResolvedValue(mockResp);
        dynamicOptions.cache.catalog = {
          ...mockCatalog,
          timestamp: new Date('1999-12-31T23:58:59.999Z'),
        };

        await expect(getNotebookCatalog(dynamicOptions)).resolves.toEqual({
          notebooks: [
            {
              id: 'unit-test',
              title: 'Test',
              description: 'Test notebook',
            },
          ],
        });

        expect(fetchMock).toHaveBeenCalledTimes(1);
        expect(fetchMock).toHaveBeenCalledWith(dynamicOptions.config.catalog!.url, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        });
      });
      it('returns cached notebooks in case of error and within error TTL', async () => {
        const mockCatalog: RemoteNotebookCatalog = {
          notebooks: [
            {
              id: 'unit-test',
              title: 'Test',
              description: 'Test notebook',
              url: 'http://localhost:3000/my_notebook.ipynb',
            },
          ],
        };
        dynamicOptions.cache.catalog = {
          ...mockCatalog,
          timestamp: new Date('1999-12-31T23:58:59.999Z'),
        };
        fetchMock.mockRejectedValue(new Error('Failed to Fetch'));
        await expect(getNotebookCatalog(dynamicOptions)).resolves.toEqual({
          notebooks: [
            {
              id: 'unit-test',
              title: 'Test',
              description: 'Test notebook',
            },
          ],
        });
        expect(fetchMock).toHaveBeenCalledTimes(1);
      });
      it('returns static notebooks in case of error and cache outside error TTL', async () => {
        const mockCatalog: RemoteNotebookCatalog = {
          notebooks: [
            {
              id: 'unit-test',
              title: 'Test',
              description: 'Test notebook',
              url: 'http://localhost:3000/my_notebook.ipynb',
            },
          ],
        };
        dynamicOptions.cache.catalog = {
          ...mockCatalog,
          timestamp: new Date('1999-12-31T12:10:00.000Z'),
        };
        fetchMock.mockRejectedValue(new Error('Failed to Fetch'));
        await expect(getNotebookCatalog(dynamicOptions)).resolves.toEqual(DEFAULT_NOTEBOOKS);
        expect(fetchMock).toHaveBeenCalledTimes(1);
      });
      it('allows additional data, but removes it from results', async () => {
        const mockCatalog = {
          notebooks: [
            {
              id: 'unit-test',
              title: 'Test',
              description: 'Test notebook',
              url: 'http://localhost:3000/my_notebook.ipynb',
              tags: ['search', 'vector', 'ml'],
            },
          ],
          categories: ['test', 'test2'],
        };
        const mockResp = {
          status: 200,
          statusText: 'OK',
          ok: true,
          json: jest.fn().mockResolvedValue(mockCatalog),
        };
        fetchMock.mockResolvedValue(mockResp);

        const result = await getNotebookCatalog(dynamicOptions);
        expect(result).toEqual({
          notebooks: [
            {
              id: 'unit-test',
              title: 'Test',
              description: 'Test notebook',
            },
          ],
        });
        expect(dynamicOptions.cache.catalog).toBeDefined();
        expect(dynamicOptions.cache.catalog).toEqual({
          ...mockCatalog,
          timestamp: fakeNow,
        });
      });
      describe('supports notebook lists', () => {
        beforeEach(() => {
          const mockCatalog: RemoteNotebookCatalog = {
            notebooks: [
              {
                id: 'unit-test',
                title: 'Test',
                description: 'Test notebook',
                url: 'http://localhost:3000/my_notebook.ipynb',
              },
              {
                id: 'unit-test-002',
                title: 'Test',
                description: 'Test notebook 2',
                url: 'http://localhost:3000/my_other_notebook.ipynb',
              },
            ],
            lists: {
              default: ['unit-test', 'unit-test-002'],
              test: ['unit-test-002'],
              vector: ['unit-test'],
            },
          };
          const mockResp = {
            status: 200,
            statusText: 'OK',
            ok: true,
            json: jest.fn().mockResolvedValue(mockCatalog),
          };
          fetchMock.mockResolvedValue(mockResp);
        });

        it('can return a custom notebook list', async () => {
          await expect(
            getNotebookCatalog({ ...dynamicOptions, notebookList: 'test' })
          ).resolves.toEqual({
            notebooks: [
              {
                id: 'unit-test-002',
                title: 'Test',
                description: 'Test notebook 2',
              },
            ],
          });
          await expect(
            getNotebookCatalog({ ...dynamicOptions, notebookList: 'vector' })
          ).resolves.toEqual({
            notebooks: [
              {
                id: 'unit-test',
                title: 'Test',
                description: 'Test notebook',
              },
            ],
          });
        });
        it('returns default list when requested list not defined', async () => {
          await expect(
            getNotebookCatalog({ ...dynamicOptions, notebookList: 'foo' })
          ).resolves.toEqual({
            notebooks: [
              {
                id: 'unit-test',
                title: 'Test',
                description: 'Test notebook',
              },
              {
                id: 'unit-test-002',
                title: 'Test',
                description: 'Test notebook 2',
              },
            ],
          });
        });
        it('returns default list when list is not specified', async () => {
          await expect(getNotebookCatalog(dynamicOptions)).resolves.toEqual({
            notebooks: [
              {
                id: 'unit-test',
                title: 'Test',
                description: 'Test notebook',
              },
              {
                id: 'unit-test-002',
                title: 'Test',
                description: 'Test notebook 2',
              },
            ],
          });
        });
      });
    });
  });

  describe('getNotebookMetadata', () => {
    const fakeNotebookId = 'unit-test';
    it('returns data from static notebooks', () => {
      expect(getNotebookMetadata(DEFAULT_NOTEBOOKS.notebooks[0].id, staticOptions.cache)).toEqual(
        DEFAULT_NOTEBOOKS.notebooks[0]
      );
    });
    it('returns undefined for unknown static notebook id', () => {
      expect(getNotebookMetadata(fakeNotebookId, staticOptions.cache)).toBeUndefined();
    });
    it('returns data from notebook catalog cache', () => {
      dynamicOptions.cache.catalog = {
        notebooks: [
          {
            id: fakeNotebookId,
            title: 'Fake Notebook',
            description: 'This is a fake notebook',
            url: 'http://localhost:4000/fake_notebook.ipynb',
          },
        ],
        timestamp: fakeNow,
      };
      expect(getNotebookMetadata(fakeNotebookId, dynamicOptions.cache)).toEqual({
        id: fakeNotebookId,
        title: 'Fake Notebook',
        description: 'This is a fake notebook',
      });
    });
    it('returns undefined when there is a catalog cache without notebook id', () => {
      dynamicOptions.cache.catalog = {
        notebooks: [
          {
            id: 'fake-notebook',
            title: 'Fake Notebook',
            description: 'This is a fake notebook',
            url: 'http://localhost:4000/fake_notebook.ipynb',
          },
        ],
        timestamp: fakeNow,
      };
      expect(getNotebookMetadata(fakeNotebookId, dynamicOptions.cache)).toBeUndefined();
    });
  });

  describe('getNotebook', () => {
    const fakeNotebookId = 'unit-test';

    describe('static notebooks', () => {
      it('throws an error if given an unknown notebook id', async () => {
        await expect(getNotebook(fakeNotebookId, staticOptions)).rejects.toThrow(
          'Unknown Notebook ID'
        );
        expect(mockLogger.warn).toHaveBeenCalledTimes(1);
      });

      it('throws an error if the file is not found', async () => {
        const notebookId = DEFAULT_NOTEBOOKS.notebooks[0].id;
        jest.mocked(fs.access).mockReset().mockRejectedValue(new Error('Boom'));

        await expect(getNotebook(notebookId, staticOptions)).rejects.toThrow(
          'Failed to fetch notebook.'
        );
      });

      it('Reads notebook', async () => {
        const notebookId = DEFAULT_NOTEBOOKS.notebooks[0].id;

        jest.mocked(fs.access).mockReset().mockResolvedValue(undefined);

        await expect(getNotebook(notebookId, staticOptions)).resolves.toMatchObject({
          cells: expect.anything(),
          metadata: expect.anything(),
        });
        expect(mockLogger.warn).not.toHaveBeenCalled();
        expect(mockLogger.error).not.toHaveBeenCalled();
        expect(fs.access).toHaveBeenCalledWith(expect.stringContaining(`${notebookId}.json`), 0);
      });
    });
    describe('remote catalog', () => {
      beforeEach(() => {
        fetchMock.mockReset();
        // Reset the notebook cache
        dynamicOptions.cache = createNotebooksCache();
        dynamicOptions.cache.catalog = {
          notebooks: [
            {
              id: 'unit-test',
              title: 'Test',
              description: 'Test notebook',
              url: 'http://localhost:3000/my_notebook.ipynb',
            },
          ],
          timestamp: fakeNow,
        };
      });

      it('fetches notebook using url in cached catalog', async () => {
        const mockNotebook: NotebookDefinition = {
          cells: [
            {
              cell_type: 'markdown',
              source: ['# Hello World'],
            },
          ],
        };
        const mockResp = {
          status: 200,
          statusText: 'OK',
          ok: true,
          json: jest.fn().mockResolvedValue(mockNotebook),
        };
        fetchMock.mockResolvedValue(mockResp);

        await expect(getNotebook(fakeNotebookId, dynamicOptions)).resolves.toEqual(mockNotebook);
        expect(fetchMock).toHaveBeenCalledTimes(1);
        expect(fetchMock).toHaveBeenCalledWith('http://localhost:3000/my_notebook.ipynb', {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        });
      });
      it('returns notebook from cache if available', async () => {
        const mockNotebook: NotebookDefinition = {
          cells: [
            {
              cell_type: 'markdown',
              source: ['# Hello World'],
            },
          ],
        };
        dynamicOptions.cache.notebooks[fakeNotebookId] = {
          ...mockNotebook,
          timestamp: new Date('1999-12-31T23:59:30.000Z'),
        };

        await expect(getNotebook(fakeNotebookId, dynamicOptions)).resolves.toEqual(mockNotebook);
        expect(fetchMock).toHaveBeenCalledTimes(0);
      });
      it('fetches notebook if cached notebook ttl is expired', async () => {
        const mockNotebook: NotebookDefinition = {
          cells: [
            {
              cell_type: 'markdown',
              source: ['# Hello World'],
            },
          ],
        };
        dynamicOptions.cache.notebooks[fakeNotebookId] = {
          ...mockNotebook,
          timestamp: new Date('1999-12-31T23:57:59.999Z'),
        };
        const mockResp = {
          status: 200,
          statusText: 'OK',
          ok: true,
          json: jest.fn().mockResolvedValue(mockNotebook),
        };
        fetchMock.mockResolvedValue(mockResp);

        await getNotebook(fakeNotebookId, dynamicOptions);
        expect(fetchMock).toHaveBeenCalledTimes(1);
        expect(fetchMock).toHaveBeenCalledWith('http://localhost:3000/my_notebook.ipynb', {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        });
      });
      it("returns undefined if can't fetch notebook", async () => {
        const mockResp = {
          status: 404,
          statusText: 'NOT_FOUND',
          ok: false,
        };
        fetchMock.mockResolvedValue(mockResp);

        await expect(getNotebook(fakeNotebookId, dynamicOptions)).resolves.toBeUndefined();
      });
      it("returns undefined if can't fetch notebook throws an error", async () => {
        fetchMock.mockRejectedValue(new Error('Boom!!'));

        await expect(getNotebook(fakeNotebookId, dynamicOptions)).resolves.toBeUndefined();
      });
    });
  });
});
