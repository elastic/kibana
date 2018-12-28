/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import produce from 'immer';
import _ from 'lodash';
import { Action, handleActions } from 'redux-actions';

import { Location, SymbolInformation } from 'vscode-languageserver-types/lib/esm/main';
import {
  closeSymbolPath,
  loadStructure,
  loadStructureFailed,
  loadStructureSuccess,
  openSymbolPath,
  SymbolsPayload,
} from '../actions';

const SPECIAL_SYMBOL_NAME = '{...}';
const SPECIAL_CONTAINER_NAME = '';

export interface SymbolWithMembers extends SymbolInformation {
  members?: Set<SymbolWithMembers>;
  path?: string;
}

type Container = SymbolWithMembers | undefined;

export interface SymbolState {
  symbols: { [key: string]: SymbolInformation[] };
  structureTree: { [key: string]: SymbolWithMembers[] };
  error?: Error;
  loading: boolean;
  lastRequestPath?: string;
  openPaths: string[];
}

const initialState: SymbolState = {
  symbols: {},
  loading: false,
  structureTree: {},
  openPaths: [],
};

const generateStructureTree: (symbols: SymbolInformation[]) => any = symbols => {
  const structureTree: SymbolWithMembers[] = [];

  function isOneLocationAfterAnotherLocation(oneLocation: Location, anotherLocation: Location) {
    const {
      line: oneLocationStartLine,
      character: oneLocationStartCharacter,
    } = oneLocation.range.start;
    const {
      line: anotherLocationStartLine,
      character: anotherLocationStartCharacter,
    } = anotherLocation.range.start;
    return (
      oneLocationStartLine > anotherLocationStartLine ||
      (oneLocationStartLine === anotherLocationStartLine &&
        oneLocationStartCharacter >= anotherLocationStartCharacter)
    );
  }

  function findContainer(containerName: string, location: Location): SymbolInformation | undefined {
    return symbols.find(
      (s: SymbolInformation) =>
        s.name === containerName && isOneLocationAfterAnotherLocation(location, s.location)
    );
  }
  symbols.forEach((s: SymbolInformation, index: number, arr: SymbolInformation[]) => {
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
      container = findContainer(s.containerName || '', s.location);
    }
    if (container) {
      if (!container.path) {
        container.path = container.name;
      }
      if (container.members) {
        container.members.add({ ...s, path: `${container.path}/${s.name}` });
      } else {
        container.members = new Set([{ ...s, path: `${container.path}/${s.name}` }]);
      }
    } else {
      structureTree.push(s);
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
      produce<SymbolState>(state, draft => {
        draft.loading = false;
        const { path, data } = action.payload!;
        draft.structureTree[path] = generateStructureTree(data);
        draft.symbols = {
          ...state.symbols,
          [path]: data,
        };
      }),
    [String(loadStructureFailed)]: (state: SymbolState, action: Action<any>) => {
      if (action.payload) {
        return produce<SymbolState>(state, draft => {
          draft.loading = false;
          draft.error = action.payload;
        });
      } else {
        return state;
      }
    },
    [String(openSymbolPath)]: (state: SymbolState, action: any) =>
      produce<SymbolState>(state, draft => {
        const path = action.payload!;
        if (!state.openPaths.includes(path)) {
          draft.openPaths.push(path);
        }
      }),
    [String(closeSymbolPath)]: (state: SymbolState, action: any) =>
      produce<SymbolState>(state, draft => {
        const idx = state.openPaths.indexOf(action.payload!);
        if (idx >= 0) {
          draft.openPaths.splice(idx, 1);
        }
      }),
  },
  initialState
);
