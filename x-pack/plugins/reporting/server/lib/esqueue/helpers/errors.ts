/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export class WorkerTimeoutError extends Error {
  public readonly timeout: number;
  public readonly jobId: string;

  constructor(message: string, props: any = {}) {
    super(message);
    this.name = 'WorkerTimeoutError';
    this.message = message;
    this.timeout = props.timeout;
    this.jobId = props.jobId;
  }
}

// tslint:disable-next-line
export class UnspecifiedWorkerError extends Error {
  public readonly jobId: string;

  constructor(message: string, props: any = {}) {
    super(message);
    this.name = 'UnspecifiedWorkerError';
    this.message = message;
    this.jobId = props.jobId;
  }
}
