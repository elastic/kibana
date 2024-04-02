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

export interface NotebookInformation {
  id: string;
  title: string;
  description: string;
}
export interface NotebookCatalog {
  notebooks: NotebookInformation[];
}

export interface Notebook extends NotebookInformation {
  link?: {
    title: string;
    url: string;
  };
  notebook: NotebookDefinition;
}

export interface NotebookDefinition {
  cells: NotebookCellType[];
  metadata?: NotebookMetadataType;
  nbformat?: number;
  nbformat_minor?: number;
}

export interface NotebookMetadataType {
  kernelspec?: {
    display_name?: string;
    language?: string;
    name?: string;
  };
  language_info?: {
    mimetype?: string;
    name?: string;
    version?: string;
  };
}

export interface NotebookCellType {
  auto_number?: number;
  cell_type?: string;
  execution_count?: number | null;
  id?: string;
  inputs?: string[];
  metadata?: {
    id?: string;
  };
  outputs?: NotebookOutputType[];
  prompt_number?: number;
  source?: string[];
}

export interface NotebookOutputType {
  name?: string;
  ename?: string;
  evalue?: string;
  traceback?: string[];
  data?: {
    'text/plain'?: string[];
    'text/html'?: string[];
    'text/latex'?: string[];
    'image/png'?: string;
    'image/jpeg'?: string;
    'image/gif'?: string;
    'image/svg+xml'?: string;
    'application/javascript'?: string[];
  };
  output_type?: string;
  png?: string;
  jpeg?: string;
  gif?: string;
  svg?: string;
  text?: string[];
  execution_count?: number;
  metadata?: {
    scrolled?: boolean;
  };
}
