/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Action } from 'redux-actions';
import { delay } from 'redux-saga';
import { call, put, takeEvery, cancel, take, fork } from 'redux-saga/effects';
import { LspRestClient, TextDocumentMethods } from '../../common/lsp_client';
import { loadStructure, loadStructureFailed, loadStructureSuccess } from '../actions';
import { ServerNotInitialized } from '../../common/lsp_error_codes';
import { languageServerInitializing } from '../actions/language_server';

const STRUCTURE_TREE_POLLING_INTERVAL_SEC = 3;

function requestStructure(uri?: string) {
  const lspClient = new LspRestClient('/api/code/lsp');
  const lspMethods = new TextDocumentMethods(lspClient);
  return lspMethods.documentSymbol.send({
    textDocument: {
      uri: uri || '',
    },
  });
}

function* beginPollingSymbols(action: Action<string>) {
  try {
    const pollingTaskId = yield fork(pollingSaga, action);
    yield take([String(loadStructureSuccess), String(loadStructureFailed)]);
    yield cancel(pollingTaskId);
  } catch (err) {
    yield put(loadStructureFailed(err));
  }
}

export function* watchLoadStructure() {
  yield takeEvery(String(loadStructure), beginPollingSymbols);
}

function* pollingSaga(action: Action<string>) {
  while (true) {
    try {
      const data = yield call(requestStructure, `git:/${action.payload}`);
      yield put(loadStructureSuccess({ path: action.payload!, data }));
    } catch (e) {
      if (e.code && e.code === ServerNotInitialized) {
        yield put(languageServerInitializing());
        yield delay(STRUCTURE_TREE_POLLING_INTERVAL_SEC * 1000);
      } else {
        yield put(loadStructureFailed(e));
      }
    }
  }
}
