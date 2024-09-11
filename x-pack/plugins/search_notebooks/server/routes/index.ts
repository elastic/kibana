/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { NotebookDefinition } from '@kbn/ipynb';

import { INTRODUCTION_NOTEBOOK } from '../../common/constants';
import { getNotebookCatalog, getNotebook, getNotebookMetadata } from '../lib/notebook_catalog';
import type { RouteDependencies } from '../types';

export function defineRoutes({ config, notebooksCache, logger, router }: RouteDependencies) {
  router.get(
    {
      path: '/internal/search_notebooks/notebooks',
      validate: {
        query: schema.object({
          list: schema.maybe(schema.string()),
        }),
      },
      options: {
        access: 'internal',
      },
    },
    async (_context, request, response) => {
      const { list } = request.query;
      const resp = await getNotebookCatalog({
        cache: notebooksCache,
        config,
        logger,
        notebookList: list,
      });

      return response.ok({
        body: resp,
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
      options: {
        access: 'internal',
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

      const notebookMetadata = getNotebookMetadata(notebookId, notebooksCache);
      if (!notebookMetadata) {
        logger.warn(`Unknown search notebook requested ${notebookId}`);
        return response.notFound();
      }
      let notebook: NotebookDefinition | undefined;
      try {
        notebook = await getNotebook(notebookId, { cache: notebooksCache, config, logger });
      } catch (e) {
        logger.warn(`Error getting search notebook ${notebookId}.`);
        logger.warn(e);
        return response.customError(e.message);
      }
      if (!notebook) {
        logger.warn(`Search notebook requested ${notebookId} not found or failed to fetch.`);
        return response.notFound();
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
