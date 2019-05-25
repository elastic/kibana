/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Uri } from 'monaco-editor';
import pathToRegexp from 'path-to-regexp';
import { Position } from 'vscode-languageserver-types';

import { RepositoryUri } from '../model';
import { MAIN, MAIN_ROOT } from '../public/components/routes';

const mainRe = pathToRegexp(MAIN);
const mainRootRe = pathToRegexp(MAIN_ROOT);

export interface ParsedUrl {
  schema?: string;
  uri?: string;
}

export interface CompleteParsedUrl extends ParsedUrl {
  repoUri: string;
  revision: string;
  pathType?: string;
  file?: string;
  schema?: string;
  position?: Position;
}

export function parseSchema(url: string): { uri: string; schema?: string } {
  let [schema, uri] = url.toString().split('//');
  if (!uri) {
    uri = schema;
    // @ts-ignore
    schema = undefined;
  }
  if (!uri.startsWith('/')) {
    uri = '/' + uri;
  }
  return { uri, schema };
}

export function parseGoto(goto: string): Position | undefined {
  const regex = /L(\d+)(:\d+)?$/;
  const m = regex.exec(goto);
  if (m) {
    const line = parseInt(m[1], 10);
    let character = 0;
    if (m[2]) {
      character = parseInt(m[2].substring(1), 10);
    }
    return {
      line,
      character,
    };
  }
}

export function parseLspUrl(url: Uri | string): CompleteParsedUrl {
  const { schema, uri } = parseSchema(url.toString());
  const mainParsed = mainRe.exec(uri);
  const mainRootParsed = mainRootRe.exec(uri);
  if (mainParsed) {
    const [resource, org, repo, pathType, revision, file, goto] = mainParsed.slice(1);
    let position;
    if (goto) {
      position = parseGoto(goto);
    }
    return {
      uri: uri.replace(goto, ''),
      repoUri: `${resource}/${org}/${repo}`,
      pathType,
      revision,
      file,
      schema,
      position,
    };
  } else if (mainRootParsed) {
    const [resource, org, repo, pathType, revision] = mainRootParsed.slice(1);
    return {
      uri,
      repoUri: `${resource}/${org}/${repo}`,
      pathType,
      revision,
      schema,
    };
  } else {
    throw new Error('invalid url ' + url);
  }
}

/*
 * From RepositoryUri to repository name.
 * e.g. github.com/elastic/elasticsearch -> elasticsearch
 */
export function toRepoName(uri: RepositoryUri): string {
  const segs = uri.split('/');
  if (segs.length !== 3) {
    throw new Error(`Invalid repository uri ${uri}`);
  }
  return segs[2];
}

/*
 * From RepositoryUri to repository name with organization prefix.
 * e.g. github.com/elastic/elasticsearch -> elastic/elasticsearch
 */
export function toRepoNameWithOrg(uri: RepositoryUri): string {
  const segs = uri.split('/');
  if (segs.length !== 3) {
    throw new Error(`Invalid repository uri ${uri}`);
  }
  return `${segs[1]}/${segs[2]}`;
}

const compiled = pathToRegexp.compile(MAIN);

export function toCanonicalUrl(lspUrl: CompleteParsedUrl) {
  const [resource, org, repo] = lspUrl.repoUri!.split('/');
  if (!lspUrl.pathType) {
    lspUrl.pathType = 'blob';
  }
  let goto;
  if (lspUrl.position) {
    goto = `!L${lspUrl.position.line + 1}:${lspUrl.position.character}`;
  }
  const data = { resource, org, repo, path: lspUrl.file, goto, ...lspUrl };
  const uri = decodeURIComponent(compiled(data));
  return lspUrl.schema ? `${lspUrl.schema}/${uri}` : uri;
}
