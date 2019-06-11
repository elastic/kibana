/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { FileTree, RepositoryUri } from '../../model';
import { RootState } from '../reducers';

export const getTree = (state: RootState) => state.file.tree;

export const lastRequestPathSelector: (state: RootState) => string = (state: RootState) =>
  state.symbol.lastRequestPath || '';

export const structureSelector = (state: RootState) => {
  const pathname = lastRequestPathSelector(state);
  const symbols = state.symbol.structureTree[pathname];
  return symbols || [];
};

export const refUrlSelector = (state: RootState) => {
  const payload = state.editor.refPayload;
  if (payload) {
    const { line, character } = payload.position;
    return `${payload.textDocument.uri}!L${line}:${character}`;
  }
  return undefined;
};

export const fileSelector = (state: RootState) => state.file.file;

export const searchScopeSelector = (state: RootState) => state.search.scope;

export const repoUriSelector = (state: RootState) => {
  const { resource, org, repo } = state.route.match.params;
  return `${resource}/${org}/${repo}`;
};

export const routeSelector = (state: RootState) => state.route.match;

export const statusSelector = (state: RootState, repoUri: RepositoryUri) => {
  return state.status.status[repoUri];
};

export const allStatusSelector = (state: RootState) => state.status.status;

export const currentPathSelector = (state: RootState) => state.route.match.params.path;

export const treeCommitsSelector = (state: RootState) => {
  const path = currentPathSelector(state);
  if (path === '') {
    return state.file.commits;
  } else {
    return state.file.treeCommits[path];
  }
};

export const hasMoreCommitsSelector = (state: RootState) => {
  const path = currentPathSelector(state);
  const isLoading = state.file.loadingCommits;
  if (isLoading) {
    return false;
  }
  if (state.file.commitsFullyLoaded[path]) {
    return false;
  }
  const commits = path === '' ? state.file.commits : state.file.treeCommits[path];
  if (!commits) {
    // To avoid infinite loops in component `InfiniteScroll`,
    // here we set hasMore to false before we receive the first batch.
    return false;
  }
  return true;
};

function find(tree: FileTree, paths: string[]): FileTree | null {
  if (paths.length === 0) {
    return tree;
  }
  const [p, ...rest] = paths;
  if (tree.children) {
    const child = tree.children.find((c: FileTree) => c.name === p);
    if (child) {
      return find(child, rest);
    }
  }
  return null;
}

export const currentTreeSelector = (state: RootState) => {
  const tree = getTree(state);
  const path = currentPathSelector(state) || '';
  return find(tree, path.split('/'));
};

export const createTreeSelector = (path: string) => (state: RootState) => {
  const tree = getTree(state);
  return find(tree, path.split('/'));
};

export const currentRepoSelector = (state: RootState) => state.repository.currentRepository;

export const repoScopeSelector = (state: RootState) => state.search.searchOptions.repoScope;

export const urlQueryStringSelector = (state: RootState) => state.route.match.location.search;
