/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { NotebookDefinition } from '@kbn/ipynb';

export interface NotebookInformation {
  id: string;
  title: string;
  description: string;
  link?: {
    title: string;
    url: string;
  };
}
export interface NotebookCatalog {
  notebooks: NotebookInformation[];
}

export interface Notebook extends NotebookInformation {
  notebook: NotebookDefinition;
}

export const NotebookCatalogSchema = schema.object(
  {
    notebooks: schema.arrayOf(
      schema.object(
        {
          id: schema.string(),
          title: schema.string(),
          description: schema.string(),
          url: schema.uri(),
          link: schema.maybe(
            schema.object({
              title: schema.string(),
              url: schema.uri(),
            })
          ),
        },
        {
          unknowns: 'allow',
        }
      ),
      { minSize: 1 }
    ),
  },
  {
    unknowns: 'allow',
  }
);
const NotebookCellSchema = schema.object(
  {
    attachments: schema.maybe(schema.any()),
    auto_number: schema.maybe(schema.number()),
    cell_type: schema.maybe(schema.string()),
    execution_count: schema.maybe(schema.nullable(schema.number())),
    id: schema.maybe(schema.string()),
    input: schema.maybe(schema.arrayOf(schema.string())),
    metadata: schema.maybe(schema.any()),
    outputs: schema.maybe(schema.arrayOf(schema.any())),
    prompt_number: schema.maybe(schema.number()),
    source: schema.maybe(schema.arrayOf(schema.string())),
  },
  {
    unknowns: 'allow',
  }
);

export const NotebookSchema = schema.object(
  {
    cells: schema.arrayOf(NotebookCellSchema, { minSize: 1 }),
    metadata: schema.maybe(schema.any()),
  },
  {
    unknowns: 'allow',
  }
);
