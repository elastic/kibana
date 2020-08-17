/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
/* eslint-disable max-classes-per-file */

import { DataRequestDescriptor, DataMeta } from '../../../common/descriptor_types';

export class DataRequest {
  private readonly _descriptor: DataRequestDescriptor;

  constructor(descriptor: DataRequestDescriptor) {
    this._descriptor = {
      ...descriptor,
    };
  }

  getData(): object | undefined {
    return this._descriptor.data;
  }

  isLoading(): boolean {
    return !!this._descriptor.dataRequestToken;
  }

  getMeta(): DataMeta {
    if (this._descriptor.dataMetaAtStart) {
      return this._descriptor.dataMetaAtStart;
    } else if (this._descriptor.dataMeta) {
      return this._descriptor.dataMeta;
    } else {
      return {};
    }
  }

  hasData(): boolean {
    return !!this._descriptor.data;
  }

  hasDataOrRequestInProgress(): boolean {
    return this.hasData() || this.isLoading();
  }

  getDataId(): string {
    return this._descriptor.dataId;
  }

  getRequestToken(): symbol | undefined {
    return this._descriptor.dataRequestToken;
  }
}

export class DataRequestAbortError extends Error {
  constructor() {
    super();
  }
}
