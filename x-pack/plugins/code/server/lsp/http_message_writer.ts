/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Message, ResponseMessage } from 'vscode-jsonrpc/lib/messages';
import { AbstractMessageWriter, MessageWriter } from 'vscode-jsonrpc/lib/messageWriter';
import { Logger } from '../log';

import { RepliesMap } from './replies_map';

export class HttpMessageWriter extends AbstractMessageWriter implements MessageWriter {
  private replies: RepliesMap;
  private logger: Logger | undefined;

  constructor(replies: RepliesMap, logger: Logger | undefined) {
    super();
    this.replies = replies;
    this.logger = logger;
  }

  public write(msg: Message): void {
    const response = msg as ResponseMessage;
    if (response.id != null) {
      // this is a response
      const id = response.id as number;
      const reply = this.replies.get(id);
      if (reply) {
        this.replies.delete(id);
        const [resolve, reject] = reply;
        if (response.error) {
          reject(response.error);
        } else {
          resolve(response);
        }
      } else {
        if (this.logger) {
          this.logger.error('missing reply functions for ' + id);
        }
      }
    } else {
      if (this.logger) {
        this.logger.info(`ignored message ${JSON.stringify(msg)} because of no id`);
      }
    }
  }
}
