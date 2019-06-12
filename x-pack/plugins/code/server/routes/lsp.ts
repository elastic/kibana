/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Boom from 'boom';
import hapi from 'hapi';
import { groupBy, last } from 'lodash';
import { ResponseError } from 'vscode-jsonrpc';
import { ResponseMessage } from 'vscode-jsonrpc/lib/messages';
import { Location } from 'vscode-languageserver-types';
import {
  ServerNotInitialized,
  UnknownFileLanguage,
  LanguageServerStartFailed,
} from '../../common/lsp_error_codes';
import { parseLspUrl } from '../../common/uri_util';
import { GitOperations } from '../git_operations';
import { Logger } from '../log';
import { LspService } from '../lsp/lsp_service';
import { SymbolSearchClient } from '../search';
import { ServerOptions } from '../server_options';
import {
  expandRanges,
  extractSourceContent,
  LineMapping,
  mergeRanges,
} from '../utils/composite_source_merger';
import { detectLanguage } from '../utils/detect_language';
import { EsClientWithRequest } from '../utils/esclient_with_request';
import { promiseTimeout } from '../utils/timeout';
import { CodeServerRouter } from '../security';

const LANG_SERVER_ERROR = 'language server error';

export function lspRoute(
  server: CodeServerRouter,
  lspService: LspService,
  serverOptions: ServerOptions
) {
  const log = new Logger(server.server);
  server.route({
    path: '/api/code/lsp/textDocument/{method}',
    async handler(req, h: hapi.ResponseToolkit) {
      if (typeof req.payload === 'object' && req.payload != null) {
        const method = req.params.method;
        if (method) {
          try {
            const result = await promiseTimeout(
              serverOptions.lsp.requestTimeoutMs,
              lspService.sendRequest(`textDocument/${method}`, req.payload, 1000)
            );
            return result;
          } catch (error) {
            if (error instanceof ResponseError) {
              // hide some errors;
              if (
                error.code !== UnknownFileLanguage ||
                error.code !== ServerNotInitialized ||
                error.code !== LanguageServerStartFailed
              ) {
                log.debug(error);
              }
              return h
                .response({ error: { code: error.code, msg: LANG_SERVER_ERROR } })
                .type('json')
                .code(500); // different code for LS errors and other internal errors.
            } else if (error.isBoom) {
              return error;
            } else {
              log.error(error);
              return h
                .response({ error: { code: error.code || 500, msg: LANG_SERVER_ERROR } })
                .type('json')
                .code(500);
            }
          }
        } else {
          return h.response('missing `method` in request').code(400);
        }
      } else {
        return h.response('json body required').code(400); // bad request
      }
    },
    method: 'POST',
  });

  server.route({
    path: '/api/code/lsp/findReferences',
    method: 'POST',
    async handler(req, h: hapi.ResponseToolkit) {
      try {
        // @ts-ignore
        const { textDocument, position } = req.payload;
        const { uri } = textDocument;
        const response: ResponseMessage = await promiseTimeout(
          serverOptions.lsp.requestTimeoutMs,
          lspService.sendRequest(
            `textDocument/references`,
            { textDocument: { uri }, position },
            1000
          )
        );
        const hover = await lspService.sendRequest('textDocument/hover', {
          textDocument: { uri },
          position,
        });
        let title: string;
        if (hover.result && hover.result.contents) {
          title = Array.isArray(hover.result.contents)
            ? hover.result.contents[0].value
            : (hover.result.contents as 'string');
        } else {
          title = last(uri.toString().split('/')) + `(${position.line}, ${position.character})`;
        }
        const gitOperations = new GitOperations(serverOptions.repoPath);
        const files = [];
        const groupedLocations = groupBy(response.result as Location[], 'uri');
        for (const url of Object.keys(groupedLocations)) {
          const { repoUri, revision, file } = parseLspUrl(url)!;
          const locations: Location[] = groupedLocations[url];
          const lines = locations.map(l => ({
            startLine: l.range.start.line,
            endLine: l.range.end.line,
          }));
          const ranges = expandRanges(lines, 1);
          const mergedRanges = mergeRanges(ranges);
          const blob = await gitOperations.fileContent(repoUri, file!, revision);
          const source = blob
            .content()
            .toString('utf8')
            .split('\n');
          const language = await detectLanguage(file!, blob.content());
          const lineMappings = new LineMapping();
          const code = extractSourceContent(mergedRanges, source, lineMappings).join('\n');
          const lineNumbers = lineMappings.toStringArray();
          const highlights = locations.map(l => {
            const { start, end } = l.range;
            const startLineNumber = lineMappings.lineNumber(start.line);
            const endLineNumber = lineMappings.lineNumber(end.line);
            return {
              startLineNumber,
              startColumn: start.character + 1,
              endLineNumber,
              endColumn: end.character + 1,
            };
          });
          files.push({
            repo: repoUri,
            file,
            language,
            uri: url,
            revision,
            code,
            lineNumbers,
            highlights,
          });
        }
        return { title, files: groupBy(files, 'repo'), uri, position };
      } catch (error) {
        log.error(error);
        if (error instanceof ResponseError) {
          return h
            .response({ error: { code: error.code, msg: LANG_SERVER_ERROR } })
            .type('json')
            .code(500); // different code for LS errors and other internal errors.
        } else if (error.isBoom) {
          return error;
        } else {
          return h
            .response({ error: { code: 500, msg: LANG_SERVER_ERROR } })
            .type('json')
            .code(500);
        }
      }
    },
  });
}

export function symbolByQnameRoute(server: CodeServerRouter, log: Logger) {
  server.route({
    path: '/api/code/lsp/symbol/{qname}',
    method: 'GET',
    async handler(req) {
      try {
        const symbolSearchClient = new SymbolSearchClient(new EsClientWithRequest(req), log);
        const res = await symbolSearchClient.findByQname(req.params.qname);
        return res;
      } catch (error) {
        return Boom.internal(`Search Exception`);
      }
    },
  });
}
