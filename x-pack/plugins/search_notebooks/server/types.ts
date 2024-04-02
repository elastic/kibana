/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface SearchNotebooksPluginSetup {}
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface SearchNotebooksPluginStart {}

export interface NotebookMetadata {
  id: string;
  title: string;
  description: string;
}
export interface NotebookCatalog {
  notebooks: NotebookMetadata[];
}

// TODO: Define Notebook type
export type NotebookDefinition = object;

export interface Notebook extends NotebookMetadata {
  link?: {
    title: string;
    url: string;
  };
  notebook: NotebookDefinition;
}
