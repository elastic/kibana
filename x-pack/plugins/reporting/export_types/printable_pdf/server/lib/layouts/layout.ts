/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { kbn_server } from '../../../../../../../../src/server/index';

export class Layout {
  public id: string = '';
  public server: kbn_server;

  constructor(id: string, server: kbn_server) {
    this.id = id;
    this.server = server;
  }
}
