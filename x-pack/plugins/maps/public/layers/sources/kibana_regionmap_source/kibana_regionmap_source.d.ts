/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { AbstractVectorSource, IVectorSource } from '../vector_source';

export interface IKibanaRegionSource extends IVectorSource {
  getVectorFileMeta(): Promise<unknown>;
}

export class KibanaRegionSource extends AbstractVectorSource implements IKibanaRegionSource {
  getVectorFileMeta(): Promise<unknown>;
}
