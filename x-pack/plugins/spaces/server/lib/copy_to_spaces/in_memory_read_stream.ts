/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import Stream from 'stream';

export class InMemoryReadStream extends Stream.Readable {
  private alreadyRead: boolean = false;

  constructor(private readonly dataset: any) {
    super();
  }

  public _read() {
    if (this.alreadyRead) {
      this.push(null);
    } else {
      this.alreadyRead = true;
      this.push(this.dataset);
    }
  }
}
