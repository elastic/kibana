/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Store } from 'redux';
import io from 'socket.io-client';
import chrome from 'ui/chrome';

import { SocketKind } from '../model';
import { updateCloneProgress, updateDeleteProgress, updateIndexProgress } from './actions';
import { installLanguageServerSuccess } from './actions/language_server';

export function bindSocket(store: Store) {
  const basePath = chrome.getBasePath();
  const socket = io('/', { path: `${basePath}/ws` });

  socket.on(SocketKind.CLONE_PROGRESS, (data: any) => {
    const { repoUri, progress, cloneProgress } = data;
    store.dispatch(
      updateCloneProgress({
        repoUri,
        progress,
        cloneProgress,
      })
    );
  });

  socket.on(SocketKind.INDEX_PROGRESS, (data: any) => {
    const { repoUri, progress } = data;
    store.dispatch(
      updateIndexProgress({
        progress,
        repoUri,
      })
    );
  });

  socket.on(SocketKind.DELETE_PROGRESS, (data: any) => {
    const { repoUri, progress } = data;
    store.dispatch(
      updateDeleteProgress({
        progress,
        repoUri,
      })
    );
  });

  socket.on(SocketKind.INSTALL_PROGRESS, (data: any) => {
    store.dispatch(installLanguageServerSuccess(data.langServerName));
  });
}
