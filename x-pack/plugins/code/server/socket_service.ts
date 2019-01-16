/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Server } from 'hapi';
import SocketIO from 'socket.io';

import { InstallEvent } from '../common/installation';
import { CloneProgress, RepositoryUri, SocketKind } from '../model';
import { Logger } from './log';

export class SocketService {
  public readonly io: SocketIO.Server;
  constructor(server: Server, private readonly log: Logger) {
    this.io = SocketIO(server.listener, { path: '/ws' });
  }

  public broadcastCloneProgress(
    repoUri: RepositoryUri,
    progress: number,
    cloneProgress?: CloneProgress
  ) {
    this.broadcastProgress(SocketKind.CLONE_PROGRESS, repoUri, progress, { cloneProgress });
  }

  public broadcastIndexProgress(repoUri: RepositoryUri, progress: number) {
    this.broadcastProgress(SocketKind.INDEX_PROGRESS, repoUri, progress, {});
  }

  public broadcastDeleteProgress(repoUri: RepositoryUri, progress: number) {
    this.broadcastProgress(SocketKind.DELETE_PROGRESS, repoUri, progress, {});
  }

  public broadcastInstallProgress(event: InstallEvent) {
    this.io.sockets.emit(SocketKind.INSTALL_PROGRESS, event);
  }

  private broadcastProgress(
    kind: SocketKind,
    repoUri: RepositoryUri,
    progress: number,
    options: any
  ) {
    this.log.debug(`broadcasting ${kind} message to all clients`);
    this.io.sockets.emit(kind, {
      ...options,
      repoUri,
      progress,
    });
  }
}
