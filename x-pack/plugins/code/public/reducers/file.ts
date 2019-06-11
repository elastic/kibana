/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import produce from 'immer';
import { Action, handleActions } from 'redux-actions';
import { FileTree, FileTreeItemType, sortFileTree } from '../../model';
import { CommitInfo, ReferenceInfo, ReferenceType } from '../../model/commit';
import {
  closeTreePath,
  fetchDirectory,
  fetchDirectorySuccess,
  fetchFileFailed,
  FetchFileResponse,
  fetchFileSuccess,
  fetchMoreCommits,
  fetchRepoBranchesSuccess,
  fetchRepoCommitsSuccess,
  fetchRepoTree,
  fetchRepoTreeFailed,
  fetchRepoTreeSuccess,
  fetchTreeCommits,
  fetchTreeCommitsFailed,
  fetchTreeCommitsSuccess,
  openTreePath,
  RepoTreePayload,
  resetRepoTree,
  routeChange,
  setNotFound,
  fetchRootRepoTreeSuccess,
  fetchRootRepoTreeFailed,
  dirNotFound,
} from '../actions';

export interface FileState {
  tree: FileTree;
  openedPaths: string[];
  // store not found directory as an array to calculate `notFound` flag by finding whether path is in this array
  notFoundDirs: string[];
  branches: ReferenceInfo[];
  tags: ReferenceInfo[];
  commits: CommitInfo[];
  file?: FetchFileResponse;
  opendir?: FileTree;
  isNotFound: boolean;
  treeCommits: { [path: string]: CommitInfo[] };
  loadingCommits: boolean;
  commitsFullyLoaded: { [path: string]: boolean };
  fileTreeLoadingPaths: string[];
}

const initialState: FileState = {
  tree: {
    name: '',
    path: '',
    children: undefined,
    type: FileTreeItemType.Directory,
  },
  openedPaths: [],
  notFoundDirs: [],
  fileTreeLoadingPaths: [''],
  branches: [],
  tags: [],
  commits: [],
  treeCommits: {},
  isNotFound: false,
  loadingCommits: false,
  commitsFullyLoaded: {},
};

function mergeNode(a: FileTree, b: FileTree): FileTree {
  const childrenMap: { [name: string]: FileTree } = {};
  if (a.children) {
    a.children.forEach(child => {
      childrenMap[child.name] = child;
    });
  }
  if (b.children) {
    b.children.forEach(childB => {
      const childA = childrenMap[childB.name];
      if (childA) {
        childrenMap[childB.name] = mergeNode(childA, childB);
      } else {
        childrenMap[childB.name] = childB;
      }
    });
  }
  return {
    ...a,
    ...b,
    children: Object.values(childrenMap).sort(sortFileTree),
  };
}

export function getPathOfTree(tree: FileTree, paths: string[]) {
  let child: FileTree | undefined = tree;
  for (const p of paths) {
    if (child && child.children) {
      child = child.children.find(c => c.name === p);
    } else {
      return null;
    }
  }
  return child;
}

export const file = handleActions(
  {
    [String(fetchRepoTree)]: (state: FileState, action: any) =>
      produce(state, draft => {
        draft.fileTreeLoadingPaths.push(action.payload!.path);
      }),
    [String(fetchRepoTreeSuccess)]: (state: FileState, action: Action<RepoTreePayload>) =>
      produce<FileState>(state, (draft: FileState) => {
        draft.notFoundDirs = draft.notFoundDirs.filter(dir => dir !== action.payload!.path);
        draft.fileTreeLoadingPaths = draft.fileTreeLoadingPaths.filter(
          p => p !== action.payload!.path && p !== ''
        );
        const { tree, path, withParents } = action.payload!;
        if (withParents || path === '/' || path === '') {
          draft.tree = mergeNode(draft.tree, tree);
        } else {
          const parentsPath = path.split('/');
          const lastPath = parentsPath.pop();
          const parent = getPathOfTree(draft.tree, parentsPath);
          if (parent) {
            parent.children = parent.children || [];
            const idx = parent.children.findIndex(c => c.name === lastPath);
            if (idx >= 0) {
              parent.children[idx] = tree;
            } else {
              parent.children.push(tree);
            }
          }
        }
      }),
    [String(fetchRootRepoTreeSuccess)]: (state: FileState, action: Action<any>) =>
      produce<FileState>(state, (draft: FileState) => {
        draft.fileTreeLoadingPaths = draft.fileTreeLoadingPaths.filter(p => p !== '/' && p !== '');
        draft.tree = mergeNode(draft.tree, action.payload!);
      }),
    [String(fetchRootRepoTreeFailed)]: (state: FileState, action: Action<any>) =>
      produce<FileState>(state, (draft: FileState) => {
        draft.fileTreeLoadingPaths = draft.fileTreeLoadingPaths.filter(p => p !== '/' && p !== '');
      }),
    [String(dirNotFound)]: (state: FileState, action: any) =>
      produce<FileState>(state, (draft: FileState) => {
        draft.notFoundDirs.push(action.payload);
      }),
    [String(resetRepoTree)]: (state: FileState) =>
      produce<FileState>(state, (draft: FileState) => {
        draft.tree = initialState.tree;
        draft.openedPaths = initialState.openedPaths;
      }),
    [String(fetchRepoTreeFailed)]: (state: FileState, action: Action<any>) =>
      produce(state, draft => {
        draft.fileTreeLoadingPaths = draft.fileTreeLoadingPaths.filter(
          p => p !== action.payload!.path && p !== ''
        );
      }),
    [String(openTreePath)]: (state: FileState, action: Action<any>) =>
      produce<FileState>(state, (draft: FileState) => {
        let path = action.payload!;
        const openedPaths = state.openedPaths;
        const pathSegs = path.split('/');
        while (!openedPaths.includes(path)) {
          draft.openedPaths.push(path);
          pathSegs.pop();
          if (pathSegs.length <= 0) {
            break;
          }
          path = pathSegs.join('/');
        }
      }),
    [String(closeTreePath)]: (state: FileState, action: Action<any>) =>
      produce<FileState>(state, (draft: FileState) => {
        const path = action.payload!;
        const isSubFolder = (p: string) => p.startsWith(path + '/');
        draft.openedPaths = state.openedPaths.filter(p => !(p === path || isSubFolder(p)));
      }),
    [String(fetchRepoCommitsSuccess)]: (state: FileState, action: any) =>
      produce<FileState>(state, draft => {
        draft.commits = action.payload;
        draft.loadingCommits = false;
      }),
    [String(fetchMoreCommits)]: (state: FileState, action: any) =>
      produce<FileState>(state, draft => {
        draft.loadingCommits = true;
      }),
    [String(fetchRepoBranchesSuccess)]: (state: FileState, action: any) =>
      produce<FileState>(state, (draft: FileState) => {
        const references = action.payload as ReferenceInfo[];
        draft.tags = references.filter(r => r.type === ReferenceType.TAG);
        draft.branches = references.filter(r => r.type !== ReferenceType.TAG);
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
    [String(fetchTreeCommits)]: (state: FileState) =>
      produce<FileState>(state, draft => {
        draft.loadingCommits = true;
      }),
    [String(fetchTreeCommitsFailed)]: (state: FileState) =>
      produce<FileState>(state, draft => {
        draft.loadingCommits = false;
      }),
    [String(fetchTreeCommitsSuccess)]: (state: FileState, action: any) =>
      produce<FileState>(state, draft => {
        const { path, commits, append } = action.payload;
        if (path === '' || path === '/') {
          if (commits.length === 0) {
            draft.commitsFullyLoaded[''] = true;
          } else if (append) {
            draft.commits = draft.commits.concat(commits);
          } else {
            draft.commits = commits;
          }
        } else {
          if (commits.length === 0) {
            draft.commitsFullyLoaded[path] = true;
          } else if (append) {
            draft.treeCommits[path] = draft.treeCommits[path].concat(commits);
          } else {
            draft.treeCommits[path] = commits;
          }
        }
        draft.loadingCommits = false;
      }),
  },
  initialState
);
