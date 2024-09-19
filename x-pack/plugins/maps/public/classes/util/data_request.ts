/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable max-classes-per-file */

import { DataRequestDescriptor, DataRequestMeta } from '../../../common/descriptor_types';

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

  getMeta(): DataRequestMeta {
    if (this._descriptor.dataRequestMetaAtStart) {
      return this._descriptor.dataRequestMetaAtStart;
    } else if (this._descriptor.dataRequestMeta) {
      return this._descriptor.dataRequestMeta;
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
