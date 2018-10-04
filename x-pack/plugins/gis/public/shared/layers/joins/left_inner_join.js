/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */


import { ESTableSource } from '../sources/es_table_source';

export class LeftInnerJoin {

  static toHash(descriptor) {
    return JSON.stringify(descriptor);
  }

  constructor(joinDescriptor) {
    this._descriptor = joinDescriptor;
    this._rightSource = new ESTableSource(joinDescriptor.right);
  }

  displayHash() {
    return LeftInnerJoin.toHash(this._descriptor);
  }

  getTableSource() {
    return this._rightSource;
  }

  getId() {
    return this._descriptor.id;
  }

}

