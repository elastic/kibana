/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { IRouter } from 'kibana/server';
import { IngestManagerAppContext } from '../../';
import { PLUGIN_ID, EPM_ROUTES } from '../../constants';

export const registerRoutes = (router: IRouter, { clusterClient }: IngestManagerAppContext) => {
  router.get(
    {
      path: EPM_ROUTES.API_CATEGORIES_PATTERN,
      validate: false,
      options: { tags: [`access:${PLUGIN_ID}`] },
    },
    async (context, req, res) => {
      return res.ok({ body: { hello: 'world' } });
    }
  );

  router.get(
    {
      path: EPM_ROUTES.API_LIST_PATTERN,
      validate: false,
      options: { tags: [`access:${PLUGIN_ID}`] },
    },
    async (context, req, res) => {
      return res.ok({ body: { hello: 'world' } });
    }
  );

  router.get(
    {
      path: `${EPM_ROUTES.API_INFO_PATTERN}/{filePath*}`,
      validate: false,
      options: { tags: [`access:${PLUGIN_ID}`] },
    },
    async (context, req, res) => {
      return res.ok({ body: { hello: 'world' } });
    }
  );

  router.get(
    {
      path: EPM_ROUTES.API_INFO_PATTERN,
      validate: false,
      options: { tags: [`access:${PLUGIN_ID}`] },
    },
    async (context, req, res) => {
      return res.ok({ body: { hello: 'world' } });
    }
  );

  router.get(
    {
      path: EPM_ROUTES.API_INSTALL_PATTERN,
      validate: false,
      options: { tags: [`access:${PLUGIN_ID}`] },
    },
    async (context, req, res) => {
      return res.ok({ body: { hello: 'world' } });
    }
  );

  router.get(
    {
      path: EPM_ROUTES.API_DELETE_PATTERN,
      validate: false,
      options: { tags: [`access:${PLUGIN_ID}`] },
    },
    async (context, req, res) => {
      return res.ok({ body: { hello: 'world' } });
    }
  );

  router.post(
    {
      path: EPM_ROUTES.API_INSTALL_DATASOURCE_PATTERN,
      validate: false,
      options: { tags: [`access:${PLUGIN_ID}`] },
    },
    async (context, req, res) => {
      return res.ok({ body: { hello: 'world' } });
    }
  );
};
