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

const SOCKET_CONNECTION_TIMEOUT = 5000; // timeout in ms

export function bindSocket(store: Store) {
  const basePath = chrome.getBasePath();
  const socket = io({
    path: `${basePath}/ws`,
    transports: ['polling', 'websocket'],
    transportOptions: {
      polling: {
        extraHeaders: {
          'kbn-xsrf': 'professionally-crafted-string-of-text',
        },
      },
    },
    timeout: SOCKET_CONNECTION_TIMEOUT,
    // ensure socket.io always tries polling first, otherwise auth will fail
    rememberUpgrade: false,
  });

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
