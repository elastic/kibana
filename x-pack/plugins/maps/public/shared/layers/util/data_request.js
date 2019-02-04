/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
export class DataRequest {

  constructor(descriptor) {
    this._descriptor = descriptor;
  }

  getData() {
    return this._descriptor.data;
  }

  isLoading() {
    return !!this._descriptor.dataRequestToken;
  }

  getMeta() {
    return this._descriptor.dataMeta;
  }

  hasDataOrRequestInProgress() {
    return this._descriptor.data || this._descriptor.dataRequestToken;
  }

  getDataId() {
    return this._descriptor.dataId;
  }

}

