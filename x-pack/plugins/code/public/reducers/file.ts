/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import produce from 'immer';
import { Action, handleActions } from 'redux-actions';
import { FileTree, FileTreeItemType } from '../../model';
import { CommitInfo, ReferenceInfo, ReferenceType } from '../../model/commit';
import {
  closeTreePath,
  fetchDirectory,
  fetchDirectorySuccess,
  fetchFile,
  fetchFileFailed,
  FetchFilePayload,
  FetchFileResponse,
  fetchFileSuccess,
  fetchRepoBranchesSuccess,
  fetchRepoCommitsSuccess,
  fetchRepoTree,
  fetchRepoTreeFailed,
  fetchRepoTreeSuccess,
  fetchTreeCommitsSuccess,
  openTreePath,
  RepoTreePayload,
  resetRepoTree,
  routeChange,
  setNotFound,
} from '../actions';

export interface FileState {
  tree: FileTree;
  loading: boolean;
  openedPaths: string[];
  branches: ReferenceInfo[];
  tags: ReferenceInfo[];
  commits: CommitInfo[];
  file?: FetchFileResponse;
  opendir?: FileTree;
  isNotFound: boolean;
  treeCommits: { [path: string]: CommitInfo[] };
  currentPath: string;
}

const initialState: FileState = {
  tree: {
    name: '',
    path: '',
    children: undefined,
    type: FileTreeItemType.Directory,
  },
  openedPaths: [],
  loading: false,
  branches: [],
  tags: [],
  commits: [],
  treeCommits: {},
  isNotFound: false,
  currentPath: '',
};

function mergeTree(draft: FileState, tree: FileTree, path: string) {
  const pathSegments = path.split('/');
  let current = draft.tree;
  let node = tree;
  if (path && current.children != null) {
    const pLastIndex = pathSegments.length - 1;
    pathSegments.forEach((p, pidx, arr) => {
      const idx = current.children!.findIndex(child => child.name === p);
      const index = node.children!.findIndex(child => child.name === p);
      if (idx >= 0 && index >= 0) {
        node = node.children![index];
        if (pidx === pLastIndex) {
          current.children![idx!] = node;
        }
        current = current.children![idx];
      }
    });
  } else {
    // it's root
    draft.tree = tree;
  }
}

export const file = handleActions(
  {
    [String(fetchRepoTree)]: (state: FileState, action: Action<any>) =>
      produce(state, draft => {
        draft.currentPath = action.payload.path;
        draft.loading = true;
      }),
    [String(fetchRepoTreeSuccess)]: (state: FileState, action: Action<RepoTreePayload>) =>
      produce<FileState>(state, draft => {
        draft.loading = false;
        const { tree, path } = action.payload!;
        mergeTree(draft, tree, path);
        if (draft.openedPaths.indexOf(path) < 0) {
          draft.openedPaths.push(path);
        }
      }),
    [String(resetRepoTree)]: (state: FileState) =>
      produce<FileState>(state, draft => {
        draft.tree = initialState.tree;
        draft.openedPaths = initialState.openedPaths;
      }),
    [String(fetchRepoTreeFailed)]: (state: FileState) =>
      produce(state, draft => {
        draft.loading = false;
      }),
    [String(openTreePath)]: (state: FileState, action: any) =>
      produce<FileState>(state, draft => {
        const path = action.payload!;
        if (!state.openedPaths.includes(path)) {
          draft.openedPaths.push(path);
        }
      }),
    [String(closeTreePath)]: (state: FileState, action: any) =>
      produce<FileState>(state, draft => {
        const idx = state.openedPaths.indexOf(action.payload!);
        if (idx >= 0) {
          draft.openedPaths.splice(idx, 1);
        }
      }),
    [String(fetchRepoCommitsSuccess)]: (state: FileState, action: any) =>
      produce<FileState>(state, draft => {
        draft.commits = action.payload;
      }),
    [String(fetchRepoBranchesSuccess)]: (state: FileState, action: any) =>
      produce<FileState>(state, draft => {
        const references = action.payload as ReferenceInfo[];
        draft.tags = references.filter(r => r.type === ReferenceType.TAG);
        draft.branches = references.filter(r => r.type !== ReferenceType.TAG);
      }),
    [String(fetchFile)]: (state: FileState, action: any) =>
      produce<FileState>(state, draft => {
        draft.file = { payload: action.payload as FetchFilePayload };
      }),
    [String(fetchFileSuccess)]: (state: FileState, action: any) =>
      produce<FileState>(state, draft => {
        draft.file = action.payload as FetchFileResponse;
        draft.isNotFound = false;
      }),
    [String(fetchFileFailed)]: (state: FileState, action: any) =>
      produce<FileState>(state, draft => {
        draft.file = undefined;
      }),
    [String(fetchDirectorySuccess)]: (state: FileState, action: any) =>
      produce<FileState>(state, draft => {
        draft.opendir = action.payload;
      }),
    [String(fetchDirectory)]: (state: FileState, action: any) =>
      produce<FileState>(state, draft => {
        draft.opendir = undefined;
      }),
    [String(setNotFound)]: (state: FileState, action: any) =>
      produce<FileState>(state, draft => {
        draft.isNotFound = action.payload;
      }),
    [String(routeChange)]: (state: FileState, action: any) =>
      produce<FileState>(state, draft => {
        draft.isNotFound = false;
      }),
    [String(fetchTreeCommitsSuccess)]: (state: FileState, action: any) =>
      produce<FileState>(state, draft => {
        const { path, commits } = action.payload;
        draft.treeCommits[path] = commits;
      }),
  },
  initialState
);
