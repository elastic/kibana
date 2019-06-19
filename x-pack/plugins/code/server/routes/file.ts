/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Commit, Reference, Revwalk } from '@elastic/nodegit';
import Boom from 'boom';
import fileType from 'file-type';
import hapi, { RequestQuery } from 'hapi';
import {
  commitInfo,
  DEFAULT_TREE_CHILDREN_LIMIT,
  GitOperations,
  referenceInfo,
} from '../git_operations';
import { extractLines } from '../utils/buffer';
import { detectLanguage } from '../utils/detect_language';
import { CodeServerRouter } from '../security';
import { RepositoryObjectClient } from '../search';
import { EsClientWithRequest } from '../utils/esclient_with_request';
import { TEXT_FILE_LIMIT } from '../../common/file';

export function fileRoute(server: CodeServerRouter, gitOps: GitOperations) {
  async function repoExists(req: hapi.Request, repoUri: string) {
    const repoObjectClient = new RepositoryObjectClient(new EsClientWithRequest(req));

    try {
      // Check if the repository already exists
      await repoObjectClient.getRepository(repoUri);
      return true;
    } catch (e) {
      return false;
    }
  }

  server.route({
    path: '/api/code/repo/{uri*3}/tree/{ref}/{path*}',
    method: 'GET',
    async handler(req: hapi.Request) {
      const { uri, path, ref } = req.params;
      const queries = req.query as RequestQuery;
      const limit = queries.limit
        ? parseInt(queries.limit as string, 10)
        : DEFAULT_TREE_CHILDREN_LIMIT;
      const skip = queries.skip ? parseInt(queries.skip as string, 10) : 0;
      const depth = queries.depth ? parseInt(queries.depth as string, 10) : 0;
      const withParents = 'parents' in queries;
      const flatten = 'flatten' in queries;
      const repoExist = await repoExists(req, uri);
      if (!repoExist) {
        return Boom.notFound(`repo ${uri} not found`);
      }

      try {
        return await gitOps.fileTree(uri, path, ref, skip, limit, withParents, depth, flatten);
      } catch (e) {
        if (e.isBoom) {
          return e;
        } else {
          return Boom.internal(e.message || e.name);
        }
      }
    },
  });

  server.route({
    path: '/api/code/repo/{uri*3}/blob/{ref}/{path*}',
    method: 'GET',
    async handler(req: hapi.Request, h: hapi.ResponseToolkit) {
      const { uri, path, ref } = req.params;
      const repoExist = await repoExists(req, uri);
      if (!repoExist) {
        return Boom.notFound(`repo ${uri} not found`);
      }
      try {
        const blob = await gitOps.fileContent(uri, path, decodeURIComponent(ref));
        if (blob.isBinary()) {
          const type = fileType(blob.content());
          if (type && type.mime && type.mime.startsWith('image/')) {
            const response = h.response(blob.content());
            response.type(type.mime);
            return response;
          } else {
            // this api will return a empty response with http code 204
            return h
              .response('')
              .type('application/octet-stream')
              .code(204);
          }
        } else {
          const line = (req.query as RequestQuery).line as string;
          if (line) {
            const [from, to] = line.split(',');
            let fromLine = parseInt(from, 10);
            let toLine = to === undefined ? fromLine + 1 : parseInt(to, 10);
            if (fromLine > toLine) {
              [fromLine, toLine] = [toLine, fromLine];
            }
            const lines = extractLines(blob.content(), fromLine, toLine);
            const lang = await detectLanguage(path, lines);
            return h.response(lines).type(`text/${lang || 'plain'}`);
          } else if (blob.content().length <= TEXT_FILE_LIMIT) {
            const lang = await detectLanguage(path, blob.content());
            return h.response(blob.content()).type(`text/${lang || 'plain'}`);
          } else {
            return h.response('').type(`text/big`);
          }
        }
      } catch (e) {
        if (e.isBoom) {
          return e;
        } else {
          return Boom.internal(e.message || e.name);
        }
      }
    },
  });

  server.route({
    path: '/app/code/repo/{uri*3}/raw/{ref}/{path*}',
    method: 'GET',
    async handler(req, h: hapi.ResponseToolkit) {
      const { uri, path, ref } = req.params;
      const repoExist = await repoExists(req, uri);
      if (!repoExist) {
        return Boom.notFound(`repo ${uri} not found`);
      }
      try {
        const blob = await gitOps.fileContent(uri, path, ref);
        if (blob.isBinary()) {
          return h.response(blob.content()).type('application/octet-stream');
        } else {
          return h.response(blob.content()).type('text/plain');
        }
      } catch (e) {
        if (e.isBoom) {
          return e;
        } else {
          return Boom.internal(e.message || e.name);
        }
      }
    },
  });

  server.route({
    path: '/api/code/repo/{uri*3}/history/{ref}',
    method: 'GET',
    handler: historyHandler,
  });

  server.route({
    path: '/api/code/repo/{uri*3}/history/{ref}/{path*}',
    method: 'GET',
    handler: historyHandler,
  });

  async function historyHandler(req: hapi.Request) {
    const { uri, ref, path } = req.params;
    const queries = req.query as RequestQuery;
    const count = queries.count ? parseInt(queries.count as string, 10) : 10;
    const after = queries.after !== undefined;
    try {
      const repoExist = await repoExists(req, uri);
      if (!repoExist) {
        return Boom.notFound(`repo ${uri} not found`);
      }
      const repository = await gitOps.openRepo(uri);
      const commit = await gitOps.getCommit(uri, decodeURIComponent(ref));
      const walk = repository.createRevWalk();
      walk.sorting(Revwalk.SORT.TIME);
      walk.push(commit.id());
      let commits: Commit[];
      if (path) {
        // magic number 10000: how many commits at the most to iterate in order to find the commits contains the path
        const results = await walk.fileHistoryWalk(path, count, 10000);
        commits = results.map(result => result.commit);
      } else {
        walk.push(commit.id());
        commits = await walk.getCommits(count);
      }
      if (after && commits.length > 0) {
        if (commits[0].id().equal(commit.id())) {
          commits = commits.slice(1);
        }
      }
      return commits.map(commitInfo);
    } catch (e) {
      if (e.isBoom) {
        return e;
      } else {
        return Boom.internal(e.message || e.name);
      }
    }
  }
  server.route({
    path: '/api/code/repo/{uri*3}/references',
    method: 'GET',
    async handler(req) {
      const uri = req.params.uri;
      const repoExist = await repoExists(req, uri);
      if (!repoExist) {
        return Boom.notFound(`repo ${uri} not found`);
      }
      try {
        const repository = await gitOps.openRepo(uri);
        const references = await repository.getReferences(Reference.TYPE.DIRECT);
        const referenceInfos = await Promise.all(references.map(referenceInfo));
        return referenceInfos.filter(info => info !== null);
      } catch (e) {
        if (e.isBoom) {
          return e;
        } else {
          return Boom.internal(e.message || e.name);
        }
      }
    },
  });

  server.route({
    path: '/api/code/repo/{uri*3}/diff/{revision}',
    method: 'GET',
    async handler(req) {
      const { uri, revision } = req.params;
      const repoExist = await repoExists(req, uri);
      if (!repoExist) {
        return Boom.notFound(`repo ${uri} not found`);
      }
      try {
        const diff = await gitOps.getCommitDiff(uri, revision);
        return diff;
      } catch (e) {
        if (e.isBoom) {
          return e;
        } else {
          return Boom.internal(e.message || e.name);
        }
      }
    },
  });

  server.route({
    path: '/api/code/repo/{uri*3}/blame/{revision}/{path*}',
    method: 'GET',
    async handler(req) {
      const { uri, path, revision } = req.params;
      const repoExist = await repoExists(req, uri);
      if (!repoExist) {
        return Boom.notFound(`repo ${uri} not found`);
      }
      try {
        const blames = await gitOps.blame(uri, decodeURIComponent(revision), path);
        return blames;
      } catch (e) {
        if (e.isBoom) {
          return e;
        } else {
          return Boom.internal(e.message || e.name);
        }
      }
    },
  });
}
