/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { IRouter } from 'kibana/server';
import { PLUGIN_ID, EPM_API_ROUTES } from '../../constants';

export const registerRoutes = (router: IRouter) => {
  router.get(
    {
      path: EPM_API_ROUTES.CATEGORIES_PATTERN,
      validate: false,
      options: { tags: [`access:${PLUGIN_ID}`] },
    },
    async (context, req, res) => {
      return res.ok({ body: { hello: 'world' } });
    }
  );

  router.get(
    {
      path: EPM_API_ROUTES.LIST_PATTERN,
      validate: false,
      options: { tags: [`access:${PLUGIN_ID}`] },
    },
    async (context, req, res) => {
      return res.ok({ body: { hello: 'world' } });
    }
  );

  router.get(
    {
      path: `${EPM_API_ROUTES.INFO_PATTERN}/{filePath*}`,
      validate: false,
      options: { tags: [`access:${PLUGIN_ID}`] },
    },
    async (context, req, res) => {
      return res.ok({ body: { hello: 'world' } });
    }
  );

  router.get(
    {
      path: EPM_API_ROUTES.INFO_PATTERN,
      validate: false,
      options: { tags: [`access:${PLUGIN_ID}`] },
    },
    async (context, req, res) => {
      return res.ok({ body: { hello: 'world' } });
    }
  );

  router.get(
    {
      path: EPM_API_ROUTES.INSTALL_PATTERN,
      validate: false,
      options: { tags: [`access:${PLUGIN_ID}`] },
    },
    async (context, req, res) => {
      return res.ok({ body: { hello: 'world' } });
    }
  );

  router.get(
    {
      path: EPM_API_ROUTES.DELETE_PATTERN,
      validate: false,
      options: { tags: [`access:${PLUGIN_ID}`] },
    },
    async (context, req, res) => {
      return res.ok({ body: { hello: 'world' } });
    }
  );
};
