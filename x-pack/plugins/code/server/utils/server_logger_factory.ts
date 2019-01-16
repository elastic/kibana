/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as Hapi from 'hapi';
import { Log } from '../log';
import { LoggerFactory } from './log_factory';

export class ServerLoggerFactory implements LoggerFactory {
  constructor(private readonly server: Hapi.Server) {}

  public getLogger(tags: string[]): Log {
    return new Log(this.server, tags);
  }
}
