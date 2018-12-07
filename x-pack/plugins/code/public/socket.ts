/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Store } from 'redux';
import io from 'socket.io-client';
import chrome from 'ui/chrome';

import { SocketKind } from '../model';
import { loadStatusSuccess } from './actions';

export function bindSocket(store: Store) {
  const basePath = chrome.getBasePath();
  const socket = io(undefined, { path: `${basePath}/ws` });

  socket.on(SocketKind.CLONE_PROGRESS, (data: any) => {
    const { repoUri, progress, cloneProgress } = data;
    store.dispatch(
      loadStatusSuccess({
        repoUri,
        status: {
          uri: repoUri,
          progress,
          cloneProgress,
        },
      })
    );
  });

  socket.on(SocketKind.INDEX_PROGRESS, (data: any) => {
    // const { repoUri, progress } = data;
    // TODO(qianliang): distribute index progress update actions to store.
  });

  socket.on(SocketKind.DELETE_PROGRESS, (data: any) => {
    // const { repoUri, progress } = data;
    // TODO(qianliang): distribute delete progress update actions to store.
  });
}
