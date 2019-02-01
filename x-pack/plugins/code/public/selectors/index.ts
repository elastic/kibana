/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { FileTree } from '../../model';
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

export const progressSelector = (state: RootState) => {
  const status = state.status.status[repoUriSelector(state)];
  if (status) {
    return status.progress === undefined ? null : status.progress;
  } else {
    return null;
  }
};

export const cloneProgressSelector = (state: RootState) => {
  const status = state.status.status[repoUriSelector(state)];
  if (status) {
    return status.cloneProgress === undefined ? null : status.cloneProgress;
  } else {
    return null;
  }
};
export const treeCommitsSelector = (state: RootState) => {
  const path = state.file.currentPath;
  if (path === '') {
    return state.file.commits;
  } else {
    return state.file.treeCommits[path];
  }
};

export const hasMoreCommitsSelector = (state: RootState) => {
  const path = state.file.currentPath;
  return !state.file.commitsFullyLoaded[path];
};

export const requestedPathsSelector = (state: RootState) => state.file.requestedPaths;

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
  const path = state.file.currentPath;
  return find(tree, path.split('/'));
};
