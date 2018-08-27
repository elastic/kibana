/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export class Layout {
  public id: string = '';
  public server: any;

  constructor(id: string, server: any) {
    this.id = id;
    this.server = server;
  }
}
