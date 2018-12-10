/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Boom from 'boom';

import hapi from 'hapi';
import { DocumentSearchRequest, RepositorySearchRequest, SymbolSearchRequest } from '../../model';
import { DocumentSearchClient, RepositorySearchClient, SymbolSearchClient } from '../search';

export function repositorySearchRoute(
  server: hapi.Server,
  repoSearchClient: RepositorySearchClient
) {
  server.route({
    path: '/api/code/search/repo',
    method: 'GET',
    async handler(req) {
      let page = 1;
      const { p, q } = req.query as hapi.RequestQuery;
      if (p) {
        page = parseInt(p as string, 10);
      }
      const searchReq: RepositorySearchRequest = {
        query: q as string,
        page,
      };
      try {
        const res = await repoSearchClient.search(searchReq);
        return res;
      } catch (error) {
        return Boom.internal(`Search Exception ${error}`);
      }
    },
  });

  server.route({
    path: '/api/code/suggestions/repo',
    method: 'GET',
    async handler(req) {
      let page = 1;
      const { p, q } = req.query as hapi.RequestQuery;
      if (p) {
        page = parseInt(p as string, 10);
      }
      const searchReq: RepositorySearchRequest = {
        query: q as string,
        page,
      };
      try {
        const res = await repoSearchClient.suggest(searchReq);
        return res;
      } catch (error) {
        return Boom.internal(`Search Exception ${error}`);
      }
    },
  });
}

export function documentSearchRoute(server: hapi.Server, docSearchClient: DocumentSearchClient) {
  server.route({
    path: '/api/code/search/doc',
    method: 'GET',
    async handler(req) {
      let page = 1;
      const { p, q, langs, repos } = req.query as hapi.RequestQuery;
      if (p) {
        page = parseInt(p as string, 10);
      }
      const searchReq: DocumentSearchRequest = {
        query: q as string,
        page,
        langFilters: langs ? (langs as string).split(',') : [],
        repoFileters: repos ? decodeURIComponent(repos as string).split(',') : [],
      };
      try {
        const res = await docSearchClient.search(searchReq);
        return res;
      } catch (error) {
        return Boom.internal(`Search Exception ${error}`);
      }
    },
  });

  server.route({
    path: '/api/code/suggestions/doc',
    method: 'GET',
    async handler(req) {
      let page = 1;
      const { p, q } = req.query as hapi.RequestQuery;
      if (p) {
        page = parseInt(p as string, 10);
      }
      const searchReq: DocumentSearchRequest = {
        query: q as string,
        page,
      };
      try {
        const res = await docSearchClient.suggest(searchReq);
        return res;
      } catch (error) {
        return Boom.internal(`Search Exception ${error}`);
      }
    },
  });
}

export function symbolSearchRoute(server: hapi.Server, symbolSearchClient: SymbolSearchClient) {
  const symbolSearchHandler = async (req: hapi.Request) => {
    let page = 1;
    const { p, q } = req.query as hapi.RequestQuery;
    if (p) {
      page = parseInt(p as string, 10);
    }
    const searchReq: SymbolSearchRequest = {
      query: q as string,
      page,
    };
    try {
      const res = await symbolSearchClient.suggest(searchReq);
      return res;
    } catch (error) {
      return Boom.internal(`Search Exception ${error}`);
    }
  };

  // Currently these 2 are the same.
  server.route({
    path: '/api/code/suggestions/symbol',
    method: 'GET',
    handler: symbolSearchHandler,
  });
  server.route({
    path: '/api/code/search/symbol',
    method: 'GET',
    handler: symbolSearchHandler,
  });
}
