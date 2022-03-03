/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { LoggerFactory, LogMeta } from 'src/core/server';

const trimStr = (toTrim: string) => {
  return typeof toTrim === 'string' ? toTrim.trim() : toTrim;
};

export interface GenericLevelLogger {
  debug: <T extends LogMeta>(msg: string, tags: string[], meta: T) => void;
  info: (msg: string) => void;
  warning: (msg: string) => void;
  error: (msg: Error) => void;
}

export class LevelLogger implements GenericLevelLogger {
  private _logger: LoggerFactory;
  private _tags: string[];
  public warning: (msg: string, tags?: string[]) => void;

  constructor(logger: LoggerFactory, tags?: string[]) {
    this._logger = logger;
    this._tags = tags || [];

    /*
     * This shortcut provides maintenance convenience: Reporting code has been
     * using both .warn and .warning
     */
    this.warning = this.warn.bind(this);
  }

  private getLogger(tags: string[]) {
    return this._logger.get(...this._tags, ...tags);
  }

  public error(err: string | Error, tags: string[] = []) {
    this.getLogger(tags).error(err);
  }

  public warn(msg: string, tags: string[] = []) {
    this.getLogger(tags).warn(msg);
  }

  // only "debug" logging supports the LogMeta for now...
  public debug<T extends LogMeta>(msg: string, tags: string[] = [], meta?: T) {
    this.getLogger(tags).debug<T>(msg, meta);
  }

  public trace(msg: string, tags: string[] = []) {
    this.getLogger(tags).trace(msg);
  }

  public info(msg: string, tags: string[] = []) {
    this.getLogger(tags).info(trimStr(msg));
  }

  public clone(tags: string[]) {
    return new LevelLogger(this._logger, [...this._tags, ...tags]);
  }
}
