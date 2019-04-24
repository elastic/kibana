/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import EventEmitter from 'events';
import * as net from 'net';
import {
  createMessageConnection,
  MessageConnection,
  SocketMessageReader,
  SocketMessageWriter,
} from 'vscode-jsonrpc';

import { RequestMessage, ResponseMessage } from 'vscode-jsonrpc/lib/messages';

import {
  ClientCapabilities,
  ExitNotification,
  InitializedNotification,
  InitializeResult,
  LogMessageNotification,
  MessageType,
  WorkspaceFolder,
} from 'vscode-languageserver-protocol/lib/main';
import { createConnection, IConnection } from 'vscode-languageserver/lib/main';

import { LspRequest } from '../../model';
import { Logger } from '../log';
import { LspOptions } from '../server_options';
import { HttpMessageReader } from './http_message_reader';
import { HttpMessageWriter } from './http_message_writer';
import { HttpRequestEmitter } from './http_request_emitter';
import { createRepliesMap } from './replies_map';

export interface ILanguageServerHandler {
  lastAccess?: number;
  handleRequest(request: LspRequest): Promise<ResponseMessage>;
  exit(): Promise<any>;
  unloadWorkspace(workspaceDir: string): Promise<void>;
}

export class LanguageServerProxy implements ILanguageServerHandler {
  public get isClosed() {
    return this.closed;
  }

  public initialized: boolean = false;
  private socket: any;
  private conn: IConnection;
  private clientConnection: MessageConnection | null = null;
  private closed: boolean = false;
  private sequenceNumber = 0;
  private httpEmitter = new HttpRequestEmitter();
  private replies = createRepliesMap();
  private readonly targetHost: string;
  private readonly targetPort: number;
  private readonly logger: Logger;
  private readonly lspOptions: LspOptions;
  private eventEmitter = new EventEmitter();

  private connectingPromise?: Promise<MessageConnection>;

  constructor(targetPort: number, targetHost: string, logger: Logger, lspOptions: LspOptions) {
    this.targetHost = targetHost;
    this.targetPort = targetPort;
    this.logger = logger;
    this.lspOptions = lspOptions;
    this.conn = createConnection(
      new HttpMessageReader(this.httpEmitter),
      new HttpMessageWriter(this.replies, logger)
    );
  }
  public handleRequest(request: LspRequest): Promise<ResponseMessage> {
    return this.receiveRequest(request.method, request.params, request.isNotification);
  }

  public receiveRequest(method: string, params: any, isNotification: boolean = false) {
    const message: RequestMessage = {
      jsonrpc: '2.0',
      id: this.sequenceNumber++,
      method,
      params,
    };
    return new Promise<ResponseMessage>((resolve, reject) => {
      if (this.lspOptions.verbose) {
        this.logger.info(`emit message ${JSON.stringify(message)}`);
      } else {
        this.logger.debug(`emit message ${JSON.stringify(message)}`);
      }
      if (isNotification) {
        // for language server as jdt, notification won't have a response message.
        this.httpEmitter.emit('message', message);
        resolve();
      } else {
        this.replies.set(message.id as number, [resolve, reject]);
        this.httpEmitter.emit('message', message);
      }
    });
  }
  public async initialize(
    clientCapabilities: ClientCapabilities,
    workspaceFolders: [WorkspaceFolder],
    initOptions?: object
  ): Promise<InitializeResult> {
    const clientConn = await this.connect();
    const rootUri = workspaceFolders[0].uri;
    const params = {
      processId: null,
      workspaceFolders,
      rootUri,
      capabilities: clientCapabilities,
    };
    return await clientConn
      .sendRequest(
        'initialize',
        initOptions ? { ...params, initializationOptions: initOptions } : params
      )
      .then(r => {
        this.logger.info(`initialized at ${rootUri}`);

        // @ts-ignore
        // TODO fix this
        clientConn.sendNotification(InitializedNotification.type, {});
        this.initialized = true;
        return r as InitializeResult;
      });
  }

  public listen() {
    this.conn.onRequest((method: string, ...params) => {
      if (this.lspOptions.verbose) {
        this.logger.info('received request method: ' + method);
      } else {
        this.logger.debug('received request method: ' + method);
      }

      return this.connect().then(clientConn => {
        if (this.lspOptions.verbose) {
          this.logger.info(`proxy method:${method} to Language Server `);
        } else {
          this.logger.debug(`proxy method:${method} to Language Server `);
        }

        return clientConn.sendRequest(method, ...params);
      });
    });
    this.conn.listen();
  }

  public async shutdown() {
    const clientConn = await this.connect();
    this.logger.info(`sending shutdown request`);
    return await clientConn.sendRequest('shutdown');
  }
  /**
   * send a exit request to Language Server
   * https://microsoft.github.io/language-server-protocol/specification#exit
   */
  public async exit() {
    if (this.clientConnection) {
      this.logger.info('sending `shutdown` request to language server.');
      const clientConn = this.clientConnection;
      await clientConn.sendRequest('shutdown').then(() => {
        this.logger.info('sending `exit` notification to language server.');

        // @ts-ignore
        // TODO fix this
        clientConn.sendNotification(ExitNotification.type);
        this.conn.dispose(); // stop listening
      });
    }
    this.closed = true; // stop the socket reconnect
    this.eventEmitter.emit('exit');
  }

  public awaitServerConnection() {
    return new Promise((res, rej) => {
      const server = net.createServer(socket => {
        this.initialized = false;
        server.close();
        this.eventEmitter.emit('connect');
        socket.on('close', () => this.onSocketClosed());

        this.logger.info('Java langserver connection established on port ' + this.targetPort);

        const reader = new SocketMessageReader(socket);
        const writer = new SocketMessageWriter(socket);
        this.clientConnection = createMessageConnection(reader, writer, this.logger);
        this.registerOnNotificationHandler(this.clientConnection);
        this.clientConnection.listen();
        res(this.clientConnection);
      });
      server.on('error', rej);
      server.listen(this.targetPort, () => {
        server.removeListener('error', rej);
        this.logger.info('Wait Java langserver connection on port ' + this.targetPort);
      });
    });
  }

  /**
   * get notification when proxy's socket disconnect
   * @param listener
   */
  public onDisconnected(listener: () => void) {
    this.eventEmitter.on('close', listener);
  }

  public onExit(listener: () => void) {
    this.eventEmitter.on('exit', listener);
  }

  /**
   * get notification when proxy's socket connect
   * @param listener
   */
  public onConnected(listener: () => void) {
    this.eventEmitter.on('connect', listener);
  }

  public connect(): Promise<MessageConnection> {
    if (this.clientConnection) {
      return Promise.resolve(this.clientConnection);
    }
    this.closed = false;
    if (!this.connectingPromise) {
      this.connectingPromise = new Promise((resolve, reject) => {
        this.socket = new net.Socket();

        this.socket.on('connect', () => {
          const reader = new SocketMessageReader(this.socket);
          const writer = new SocketMessageWriter(this.socket);
          this.clientConnection = createMessageConnection(reader, writer, this.logger);
          this.registerOnNotificationHandler(this.clientConnection);
          this.clientConnection.listen();
          resolve(this.clientConnection);
          this.eventEmitter.emit('connect');
        });

        this.socket.on('close', () => this.onSocketClosed());

        this.socket.on('error', () => void 0);
        this.socket.on('timeout', () => void 0);
        this.socket.on('drain', () => void 0);
        this.socket.connect(
          this.targetPort,
          this.targetHost
        );
        this.onDisconnected(() => setTimeout(() => this.reconnect(), 1000));
      });
    }
    return this.connectingPromise;
  }

  public unloadWorkspace(workspaceDir: string): Promise<void> {
    return Promise.reject('should not hit here');
  }

  private reconnect() {
    if (!this.isClosed) {
      this.socket.connect(
        this.targetPort,
        this.targetHost
      );
    }
  }

  private onSocketClosed() {
    if (this.clientConnection) {
      this.clientConnection.dispose();
    }
    this.clientConnection = null;
    this.eventEmitter.emit('close');
  }

  private registerOnNotificationHandler(clientConnection: MessageConnection) {
    // @ts-ignore
    clientConnection.onNotification(LogMessageNotification.type, notification => {
      switch (notification.type) {
        case MessageType.Log:
          this.logger.debug(notification.message);
          break;
        case MessageType.Info:
          if (this.lspOptions.verbose) {
            this.logger.info(notification.message);
          } else {
            this.logger.debug(notification.message);
          }
          break;
        case MessageType.Warning:
          if (this.lspOptions.verbose) {
            this.logger.warn(notification.message);
          } else {
            this.logger.log(notification.message);
          }
          break;
        case MessageType.Error:
          if (this.lspOptions.verbose) {
            this.logger.error(notification.message);
          } else {
            this.logger.warn(notification.message);
          }
          break;
      }
    });
  }
}
