/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { NotebookDefinition } from '@kbn/ipynb';
import { NotebookCatalog, NotebookInformation } from '../common/types';
import type {
  CachedNotebook,
  CachedNotebookCatalog,
  NotebooksCache,
  RemoteNotebookInformation,
} from './types';

export function createNotebooksCache(): NotebooksCache {
  return {
    notebooks: {},
  };
}

export function dateWithinTTL(value: Date, ttl: number) {
  return (Date.now() - value.getTime()) / 1000 <= ttl;
}

export function cleanCachedNotebookCatalog(catalog: CachedNotebookCatalog): NotebookCatalog {
  const notebooks = catalog.notebooks.map(cleanNotebookMetadata);
  return {
    notebooks,
  };
}
export function cleanCachedNotebook(notebook: CachedNotebook): NotebookDefinition {
  const { timestamp, ...result } = notebook;
  return result;
}

export function cleanNotebookMetadata(nb: RemoteNotebookInformation): NotebookInformation {
  const { id, title, description, link } = nb;
  return {
    description,
    id,
    link,
    title,
  };
}
