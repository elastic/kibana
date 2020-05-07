/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import actionCreatorFactory from 'typescript-fsa';
import { i18n } from '@kbn/i18n';
import { takeLatest, select, call } from 'redux-saga/effects';
import { GraphStoreDependencies, GraphState } from '.';
import { datasourceSelector } from './datasource';
import { selectedFieldsSelector } from './fields';
import { fetchTopNodes } from '../services/fetch_top_nodes';
const actionCreator = actionCreatorFactory('x-pack/graph');

export const fillWorkspace = actionCreator<void>('FILL_WORKSPACE');

/**
 * Saga handling filling in top terms into workspace.
 *
 * It will load the top terms of the selected fields, add them to the workspace and fill in the connections.
 */
export const fillWorkspaceSaga = ({
  getWorkspace,
  setWorkspaceInitialized,
  notifyAngular,
  http,
  notifications,
}: GraphStoreDependencies) => {
  function* fetchNodes() {
    try {
      const workspace = getWorkspace();
      if (!workspace) {
        return;
      }

      const state: GraphState = yield select();
      const fields = selectedFieldsSelector(state);
      const datasource = datasourceSelector(state).current;
      if (datasource.type === 'none') {
        return;
      }

      const topTermNodes = yield call(fetchTopNodes, http.post, datasource.title, fields);
      workspace.mergeGraph({
        nodes: topTermNodes,
        edges: [],
      });
      setWorkspaceInitialized();
      notifyAngular();
      workspace.fillInGraph(fields.length * 10);
    } catch (e) {
      const message = 'body' in e ? e.body.message : e.message;
      notifications.toasts.addDanger({
        title: i18n.translate('xpack.graph.fillWorkspaceError', {
          defaultMessage: 'Fetching top terms failed: {message}',
          values: { message },
        }),
      });
    }
  }

  return function*() {
    yield takeLatest(fillWorkspace.match, fetchNodes);
  };
};
