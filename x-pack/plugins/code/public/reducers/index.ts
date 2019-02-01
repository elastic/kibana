/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { combineReducers } from 'redux';

import { blame, BlameState } from './blame';
import { commit, CommitState } from './commit';
import { editor, EditorState } from './editor';
import { file, FileState } from './file';
import { languageServer, LanguageServerState } from './language_server';
import { repository, RepositoryState } from './repository';
import { route, RouteState } from './route';
import { search, SearchState } from './search';
import { shortcuts, ShortcutsState } from './shortcuts';
import { RepoState, RepoStatus, status, StatusState } from './status';
import { symbol, SymbolState } from './symbol';
import { userConfig, UserConfigState } from './user';

export { RepoState, RepoStatus };

export interface RootState {
  repository: RepositoryState;
  search: SearchState;
  file: FileState;
  symbol: SymbolState;
  editor: EditorState;
  route: RouteState;
  status: StatusState;
  userConfig: UserConfigState;
  commit: CommitState;
  blame: BlameState;
  languageServer: LanguageServerState;
  shortcuts: ShortcutsState;
}

const reducers = {
  repository,
  file,
  symbol,
  editor,
  search,
  route,
  status,
  userConfig,
  commit,
  blame,
  languageServer,
  shortcuts,
};

// @ts-ignore
export const rootReducer = combineReducers<RootState>(reducers);
