/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { LoggerFactory } from 'src/core/server';

const trimStr = (toTrim: string) => {
  return typeof toTrim === 'string' ? toTrim.trim() : toTrim;
};

export class LevelLogger {
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

  public info(msg: string, tags: string[] = []) {
    this.getLogger(tags).info(trimStr(msg));
  }

  public clone(tags: string[]) {
    return new LevelLogger(this._logger, [...this._tags, ...tags]);
  }
}
