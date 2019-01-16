/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Logger } from '../log';

export class ConsoleLogger extends Logger {
  constructor() {
    // @ts-ignore
    super(undefined);
  }

  public info(msg: string | any) {
    // tslint:disable-next-line:no-console
    console.info(msg);
  }

  public error(msg: string | any) {
    // tslint:disable-next-line:no-console
    console.error(msg);
  }

  public log(message: string): void {
    // tslint:disable-next-line:no-console
    this.info(message);
  }

  public debug(msg: string | any) {
    // tslint:disable-next-line:no-console
    console.debug(msg);
  }

  public warn(msg: string | any): void {
    // tslint:disable-next-line:no-console
    console.warn(msg);
  }

  public stdout(msg: string | any) {
    // tslint:disable-next-line:no-console
    console.info(msg);
  }

  public stderr(msg: string | any) {
    // tslint:disable-next-line:no-console
    console.error(msg);
  }
}
