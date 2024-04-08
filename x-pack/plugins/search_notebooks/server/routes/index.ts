/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import type { IRouter } from '@kbn/core/server';
import type { Logger } from '@kbn/logging';
import { NotebookDefinition } from '@kbn/ipynb';

import { INTRODUCTION_NOTEBOOK } from '../../common/constants';
import { DEFAULT_NOTEBOOKS, NOTEBOOKS_MAP, getNotebook } from '../lib/notebook_catalog';

export function defineRoutes(router: IRouter, logger: Logger) {
  router.get(
    {
      path: '/internal/search_notebooks/notebooks',
      validate: {},
    },
    async (_context, _request, response) => {
      return response.ok({
        body: DEFAULT_NOTEBOOKS,
        headers: { 'content-type': 'application/json' },
      });
    }
  );

  router.get(
    {
      path: '/internal/search_notebooks/notebooks/{notebookId}',
      validate: {
        params: schema.object({
          notebookId: schema.string(),
        }),
      },
    },
    async (_, request, response) => {
      const notebookId = request.params.notebookId;

      if (notebookId === INTRODUCTION_NOTEBOOK.id) {
        return response.ok({
          body: INTRODUCTION_NOTEBOOK,
          headers: { 'content-type': 'application/json' },
        });
      }

      if (!NOTEBOOKS_MAP.hasOwnProperty(notebookId)) {
        logger.warn(`Unknown search notebook requested ${notebookId}`);
        return response.notFound();
      }

      const notebookMetadata = NOTEBOOKS_MAP[notebookId];
      let notebook: NotebookDefinition;
      try {
        notebook = await getNotebook(notebookId, { logger });
      } catch (e) {
        return response.customError(e.message);
      }
      return response.ok({
        body: {
          ...notebookMetadata,
          notebook,
        },
        headers: { 'content-type': 'application/json' },
      });
    }
  );
}
