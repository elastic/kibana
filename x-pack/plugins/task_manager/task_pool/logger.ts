/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export type LogFn = (prefix: string[], msg: string) => void;

export class Logger {
  private log: LogFn;

  constructor(log: LogFn) {
    this.log = log;
  }

  public warning(msg: string) {
    this.log(['warning', 'task_manager'], msg);
  }

  public debug(msg: string) {
    this.log(['debug', 'task_manager'], msg);
  }

  public info(msg: string) {
    this.log(['info', 'task_manager'], msg);
  }
}
