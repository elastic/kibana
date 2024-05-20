/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IRouter } from '@kbn/core/server';
import type { NotebookDefinition } from '@kbn/ipynb';
import type { Logger } from '@kbn/logging';

import type { SearchNotebooksConfig } from './config';
import type { NotebookCatalog, NotebookInformation } from '../common/types';

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface SearchNotebooksPluginSetup {}
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface SearchNotebooksPluginStart {}

export interface RouteDependencies {
  config: SearchNotebooksConfig;
  logger: Logger;
  notebooksCache: NotebooksCache;
  router: IRouter;
}

export interface RemoteNotebookInformation extends NotebookInformation {
  url: string;
}

export interface RemoteNotebookCatalog extends NotebookCatalog {
  notebooks: RemoteNotebookInformation[];
}

export interface CachedNotebookCatalog extends RemoteNotebookCatalog {
  timestamp: Date;
}

export interface CachedNotebook extends NotebookDefinition {
  timestamp: Date;
}
export interface NotebooksCache {
  catalog?: CachedNotebookCatalog;
  notebooks: Record<string, CachedNotebook>;
}
