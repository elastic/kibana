/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { AbstractVectorSource, IVectorSource } from '../vector_source';

export interface IEmsFileSource extends IVectorSource {
  getEMSFileLayer(): Promise<unknown>;
}

export class EMSFileSource extends AbstractVectorSource implements IEmsFileSource {
  getEMSFileLayer(): Promise<unknown>;
}
