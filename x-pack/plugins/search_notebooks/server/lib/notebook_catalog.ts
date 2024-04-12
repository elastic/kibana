/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import fs from 'fs/promises';
import path from 'path';
import { i18n } from '@kbn/i18n';
import type { Logger } from '@kbn/logging';

import { NotebookCatalog, NotebookInformation, NotebookDefinition } from '../types';

const NOTEBOOKS_DATA_DIR = '../data';

export const DEFAULT_NOTEBOOKS: NotebookCatalog = {
  notebooks: [
    {
      id: '00_quick_start',
      title: i18n.translate('xpack.searchNotebooks.notebooksCatalog.quickStart.title', {
        defaultMessage: 'Semantic search quick start',
      }),
      description: i18n.translate('xpack.searchNotebooks.notebooksCatalog.quickStart.description', {
        defaultMessage:
          "This interactive notebook will introduce you to some basic operations with Elasticsearch, using the official Elasticsearch Python client. You'll perform semantic search using Sentence Transformers for text embedding. Learn how to integrate traditional text-based search with semantic search, for a hybrid search system.",
      }),
    },
    {
      id: '01_keyword_querying_filtering',
      title: i18n.translate('xpack.searchNotebooks.notebooksCatalog.keywordQueryFiltering.title', {
        defaultMessage: 'Keyword querying and filtering',
      }),
      description: i18n.translate(
        'xpack.searchNotebooks.notebooksCatalog.keywordQueryFiltering.description',
        {
          defaultMessage:
            'This interactive notebook will introduce you to the basic Elasticsearch queries, using the official Elasticsearch Python client. Before getting started on this section you should work through our quick start, as you will be using the same dataset.',
        }
      ),
    },
    {
      id: '02_hybrid_search',
      title: i18n.translate('xpack.searchNotebooks.notebooksCatalog.hybridSearch.title', {
        defaultMessage: 'Hybrid Search using RRF',
      }),
      description: i18n.translate(
        'xpack.searchNotebooks.notebooksCatalog.hybridSearch.description',
        {
          defaultMessage:
            'This interactive notebook will use the reciprocal rank fusion algorithm to combine the results of BM25 and kNN semantic search.',
        }
      ),
    },
    {
      id: '03_elser',
      title: i18n.translate('xpack.searchNotebooks.notebooksCatalog.elser.title', {
        defaultMessage: 'Semantic Search using ELSER v2 text expansion',
      }),
      description: i18n.translate('xpack.searchNotebooks.notebooksCatalog.elser.description', {
        defaultMessage: 'Learn how to use ELSER for text expansion-powered semantic search.',
      }),
    },
    {
      id: '04_multilingual',
      title: i18n.translate('xpack.searchNotebooks.notebooksCatalog.multilingual.title', {
        defaultMessage: 'Multilingual semantic search',
      }),
      description: i18n.translate(
        'xpack.searchNotebooks.notebooksCatalog.multilingual.description',
        {
          defaultMessage:
            "In this example we'll use a multilingual embedding model 'multilingual-e5-base' to perform search on a dataset of mixed language documents.",
        }
      ),
    },
  ],
};
export const NOTEBOOKS_MAP: Record<string, NotebookInformation> =
  DEFAULT_NOTEBOOKS.notebooks.reduce((nbMap, nb) => {
    nbMap[nb.id] = nb;
    return nbMap;
  }, {} as Record<string, NotebookInformation>);

const NOTEBOOK_IDS = DEFAULT_NOTEBOOKS.notebooks.map(({ id }) => id);

export const getNotebook = async (
  notebookId: string,
  { logger }: { logger: Logger }
): Promise<NotebookDefinition> => {
  // Only server pre-defined notebooks, since we're reading files from disk only allow IDs
  // for the known notebooks so that we aren't attempting to read any file from disk given user input
  if (!NOTEBOOK_IDS.includes(notebookId)) {
    logger.warn(`Unknown search notebook requested ${notebookId}`);
    throw new Error(
      i18n.translate('xpack.searchNotebooks.notebooksCatalog.errors.unknownId', {
        defaultMessage: 'Unknown Notebook ID',
      })
    );
  }

  const notebookPath = path.join(__dirname, NOTEBOOKS_DATA_DIR, `${notebookId}.json`);
  try {
    await fs.access(notebookPath, fs.constants.F_OK);
    const notebook = (await import(notebookPath)).default;
    return notebook;
  } catch (err) {
    logger.error(`Error reading search notebook ${notebookId}`, err);
    throw new Error(
      i18n.translate('xpack.searchNotebooks.notebooksCatalog.errors.notebookImportFailure', {
        defaultMessage: 'Failed to fetch notebook.',
      })
    );
  }
};
