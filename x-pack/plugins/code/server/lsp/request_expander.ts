/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import fs from 'fs';
import path from 'path';
import { pathToFileURL } from 'url';

import { ResponseError, ResponseMessage } from 'vscode-jsonrpc/lib/messages';
import { DidChangeWorkspaceFoldersParams, InitializeResult } from 'vscode-languageserver-protocol';

import { ServerNotInitialized } from '../../common/lsp_error_codes';
import { LspRequest } from '../../model';
import { ServerOptions } from '../server_options';
import { promiseTimeout } from '../utils/timeout';
import { ILanguageServerHandler, LanguageServerProxy } from './proxy';

interface Job {
  request: LspRequest;
  resolve: (response: ResponseMessage) => void;
  reject: (error: any) => void;
  startTime: number;
}

enum WorkspaceStatus {
  Uninitialized,
  Initializing,
  Initialized,
}

interface Workspace {
  lastAccess: number;
  status: WorkspaceStatus;
  initPromise?: Promise<any>;
}

export const InitializingError = new ResponseError(ServerNotInitialized, 'Server is initializing');

export class RequestExpander implements ILanguageServerHandler {
  public lastAccess: number = 0;
  private proxy: LanguageServerProxy;
  private jobQueue: Job[] = [];
  // a map for workspacePath -> Workspace
  private workspaces: Map<string, Workspace> = new Map();
  private readonly workspaceRoot: string;
  private running = false;
  private exited = false;

  constructor(
    proxy: LanguageServerProxy,
    readonly builtinWorkspace: boolean,
    readonly maxWorkspace: number,
    readonly serverOptions: ServerOptions,
    readonly initialOptions?: object
  ) {
    this.proxy = proxy;
    this.handle = this.handle.bind(this);
    proxy.onDisconnected(() => {
      this.workspaces.clear();
    });
    this.workspaceRoot = fs.realpathSync(this.serverOptions.workspacePath);
  }

  public handleRequest(request: LspRequest): Promise<ResponseMessage> {
    this.lastAccess = Date.now();
    return new Promise<ResponseMessage>((resolve, reject) => {
      if (this.exited) {
        reject(new Error('proxy is exited.'));
      }
      this.jobQueue.push({
        request,
        resolve,
        reject,
        startTime: Date.now(),
      });
      if (!this.running) {
        this.running = true;
        this.handleNext();
      }
    });
  }

  public async exit() {
    this.exited = true;
    return this.proxy.exit();
  }

  public async unloadWorkspace(workspacePath: string) {
    if (this.hasWorkspacePath(workspacePath)) {
      if (this.builtinWorkspace) {
        this.removeWorkspace(workspacePath);
        const params: DidChangeWorkspaceFoldersParams = {
          event: {
            removed: [
              {
                name: workspacePath!,
                uri: pathToFileURL(workspacePath).href,
              },
            ],
            added: [],
          },
        };
        await this.proxy.handleRequest({
          method: 'workspace/didChangeWorkspaceFolders',
          params,
          isNotification: true,
        });
      } else {
        await this.exit();
      }
    }
  }

  public async initialize(workspacePath: string): Promise<void | InitializeResult> {
    this.updateWorkspace(workspacePath);
    const ws = this.getWorkspace(workspacePath);
    ws.status = WorkspaceStatus.Initializing;

    try {
      if (this.builtinWorkspace) {
        if (this.proxy.initialized) {
          await this.changeWorkspaceFolders(workspacePath, this.maxWorkspace);
        } else {
          // this is the first workspace, init the lsp server first
          await this.sendInitRequest(workspacePath);
        }
        ws.status = WorkspaceStatus.Initialized;
      } else {
        for (const w of this.workspaces.values()) {
          if (w.status === WorkspaceStatus.Initialized) {
            await this.proxy.shutdown();
            this.workspaces.clear();
            break;
          }
        }
        const response = await this.sendInitRequest(workspacePath);
        ws.status = WorkspaceStatus.Initialized;
        return response;
      }
    } catch (e) {
      ws.status = WorkspaceStatus.Uninitialized;
      throw e;
    }
  }

  private async sendInitRequest(workspacePath: string) {
    return await this.proxy.initialize(
      {},
      [
        {
          name: workspacePath,
          uri: pathToFileURL(workspacePath).href,
        },
      ],
      this.initialOptions
    );
  }

  private handle() {
    const job = this.jobQueue.shift();
    if (job && !this.exited) {
      const { request, resolve, reject } = job;
      this.expand(request, job.startTime).then(
        value => {
          try {
            resolve(value);
          } finally {
            this.handleNext();
          }
        },
        err => {
          try {
            reject(err);
          } finally {
            this.handleNext();
          }
        }
      );
    } else {
      this.running = false;
    }
  }

  private handleNext() {
    setTimeout(this.handle, 0);
  }

  private async expand(request: LspRequest, startTime: number): Promise<ResponseMessage> {
    if (request.workspacePath) {
      const ws = this.getWorkspace(request.workspacePath);
      if (ws.status === WorkspaceStatus.Uninitialized) {
        ws.initPromise = this.initialize(request.workspacePath);
      }
      // Uninitialized or initializing
      if (ws.status !== WorkspaceStatus.Initialized) {
        const timeout = request.timeoutForInitializeMs || 0;

        if (timeout > 0 && ws.initPromise) {
          try {
            const elapsed = Date.now() - startTime;
            await promiseTimeout(timeout - elapsed, ws.initPromise);
          } catch (e) {
            if (e.isTimeout) {
              throw InitializingError;
            }
            throw e;
          }
        } else if (ws.initPromise) {
          await ws.initPromise;
        } else {
          throw InitializingError;
        }
      }
    }
    return await this.proxy.handleRequest(request);
  }

  /**
   * use DidChangeWorkspaceFolders notification add a new workspace folder
   * replace the oldest one if count > maxWorkspace
   * builtinWorkspace = false is equal to maxWorkspace =1
   * @param workspacePath
   * @param maxWorkspace
   */
  private async changeWorkspaceFolders(workspacePath: string, maxWorkspace: number): Promise<void> {
    const params: DidChangeWorkspaceFoldersParams = {
      event: {
        added: [
          {
            name: workspacePath!,
            uri: pathToFileURL(workspacePath).href,
          },
        ],
        removed: [],
      },
    };
    this.updateWorkspace(workspacePath);

    if (this.workspaces.size > this.maxWorkspace) {
      let oldestWorkspace;
      let oldestAccess = Number.MAX_VALUE;
      for (const [workspace, ws] of this.workspaces) {
        if (ws.lastAccess < oldestAccess) {
          oldestAccess = ws.lastAccess;
          oldestWorkspace = path.join(this.serverOptions.workspacePath, workspace);
        }
      }
      if (oldestWorkspace) {
        params.event.removed.push({
          name: oldestWorkspace,
          uri: pathToFileURL(oldestWorkspace).href,
        });
        this.removeWorkspace(oldestWorkspace);
      }
    }
    // adding a workspace folder may also need initialize
    await this.proxy.handleRequest({
      method: 'workspace/didChangeWorkspaceFolders',
      params,
      isNotification: true,
    });
  }

  private removeWorkspace(workspacePath: string) {
    this.workspaces.delete(this.relativePath(workspacePath));
  }

  private updateWorkspace(workspacePath: string) {
    this.getWorkspace(workspacePath).status = Date.now();
  }

  private hasWorkspacePath(workspacePath: string) {
    return this.workspaces.has(this.relativePath(workspacePath));
  }

  /**
   * use a relative path to prevent bugs due to symbolic path
   * @param workspacePath
   */
  private relativePath(workspacePath: string) {
    const realPath = fs.realpathSync(workspacePath);
    return path.relative(this.workspaceRoot, realPath);
  }

  private getWorkspace(workspacePath: string): Workspace {
    const p = this.relativePath(workspacePath);
    let ws = this.workspaces.get(p);
    if (!ws) {
      ws = {
        status: WorkspaceStatus.Uninitialized,
        lastAccess: Date.now(),
      };
      this.workspaces.set(p, ws);
    }
    return ws;
  }
}
