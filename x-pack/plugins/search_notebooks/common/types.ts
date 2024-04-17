/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { NotebookDefinition } from '@kbn/ipynb';

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
