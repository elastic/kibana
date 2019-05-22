/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import produce from 'immer';
import _ from 'lodash';
import { Action, handleActions } from 'redux-actions';

import { SymbolInformation } from 'vscode-languageserver-types/lib/esm/main';
import {
  closeSymbolPath,
  loadStructure,
  loadStructureFailed,
  loadStructureSuccess,
  openSymbolPath,
  SymbolsPayload,
} from '../actions';
import { languageServerInitializing } from '../actions/language_server';

const SPECIAL_SYMBOL_NAME = '{...}';
const SPECIAL_CONTAINER_NAME = '';

export interface SymbolWithMembers extends SymbolInformation {
  members?: SymbolWithMembers[];
  path?: string;
}

type Container = SymbolWithMembers | undefined;

export interface SymbolState {
  symbols: { [key: string]: SymbolInformation[] };
  structureTree: { [key: string]: SymbolWithMembers[] };
  error?: Error;
  loading: boolean;
  lastRequestPath?: string;
  closedPaths: string[];
  languageServerInitializing: boolean;
}

const initialState: SymbolState = {
  symbols: {},
  loading: false,
  structureTree: {},
  closedPaths: [],
  languageServerInitializing: false,
};

const sortSymbol = (a: SymbolWithMembers, b: SymbolWithMembers) => {
  const lineDiff = a.location.range.start.line - b.location.range.start.line;
  if (lineDiff === 0) {
    return a.location.range.start.character - b.location.range.start.character;
  } else {
    return lineDiff;
  }
};

const generateStructureTree: (symbols: SymbolInformation[]) => any = symbols => {
  const structureTree: SymbolWithMembers[] = [];

  function findContainer(
    tree: SymbolWithMembers[],
    containerName?: string
  ): SymbolInformation | undefined {
    if (containerName === undefined) {
      return undefined;
    }
    const regex = new RegExp(`^${containerName}[<(]?.*[>)]?$`);
    const result = tree.find((s: SymbolInformation) => {
      return regex.test(s.name);
    });
    if (result) {
      return result;
    } else {
      const subTree = tree
        .filter(s => s.members)
        .map(s => s.members)
        .flat();
      if (subTree.length > 0) {
        return findContainer(subTree, containerName);
      } else {
        return undefined;
      }
    }
  }

  symbols
    .sort(sortSymbol)
    .forEach((s: SymbolInformation, index: number, arr: SymbolInformation[]) => {
      let container: Container;
      /**
       * For Enum class in Java, the container name and symbol name that LSP gives are special.
       * For more information, see https://github.com/elastic/codesearch/issues/580
       */
      if (s.containerName === SPECIAL_CONTAINER_NAME) {
        container = _.findLast(
          arr.slice(0, index),
          (sy: SymbolInformation) => sy.name === SPECIAL_SYMBOL_NAME
        );
      } else {
        container = findContainer(structureTree, s.containerName);
      }
      if (container) {
        if (!container.path) {
          container.path = container.name;
        }
        if (container.members) {
          container.members.push({ ...s, path: `${container.path}/${s.name}` });
        } else {
          container.members = [{ ...s, path: `${container.path}/${s.name}` }];
        }
      } else {
        structureTree.push({ ...s, path: s.name });
      }
    });

  return structureTree;
};

export const symbol = handleActions(
  {
    [String(loadStructure)]: (state: SymbolState, action: Action<any>) =>
      produce<SymbolState>(state, draft => {
        draft.loading = true;
        draft.lastRequestPath = action.payload || '';
      }),
    [String(loadStructureSuccess)]: (state: SymbolState, action: Action<SymbolsPayload>) =>
      produce<SymbolState>(state, (draft: SymbolState) => {
        draft.loading = false;
        const { path, data } = action.payload!;
        draft.structureTree[path] = generateStructureTree(data);
        draft.symbols = {
          ...state.symbols,
          [path]: data,
        };
        draft.languageServerInitializing = false;
        draft.error = undefined;
      }),
    [String(loadStructureFailed)]: (state: SymbolState, action: Action<any>) =>
      produce<SymbolState>(state, draft => {
        if (action.payload) {
          draft.loading = false;
          draft.error = action.payload;
        }
        draft.languageServerInitializing = false;
      }),
    [String(closeSymbolPath)]: (state: SymbolState, action: Action<any>) =>
      produce<SymbolState>(state, (draft: SymbolState) => {
        const path = action.payload!;
        if (!state.closedPaths.includes(path)) {
          draft.closedPaths.push(path);
        }
      }),
    [String(openSymbolPath)]: (state: SymbolState, action: any) =>
      produce<SymbolState>(state, draft => {
        const idx = state.closedPaths.indexOf(action.payload!);
        if (idx >= 0) {
          draft.closedPaths.splice(idx, 1);
        }
      }),
    [String(languageServerInitializing)]: (state: SymbolState) =>
      produce<SymbolState>(state, draft => {
        draft.languageServerInitializing = true;
      }),
  },
  initialState
);
