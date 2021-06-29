/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { LoggerFactory } from 'src/core/server';

const trimStr = (toTrim: string) => {
  return typeof toTrim === 'string' ? toTrim.trim() : toTrim;
};

export interface GenericLevelLogger {
  debug: (msg: string) => void;
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

  public debug(msg: string, tags: string[] = []) {
    this.getLogger(tags).debug(msg);
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
