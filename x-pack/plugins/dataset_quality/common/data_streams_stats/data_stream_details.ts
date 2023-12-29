/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DataStreamDetailsType } from './types';

export class DataStreamDetails {
  createdOn?: number;

  private constructor(obj: DataStreamDetails) {
    this.createdOn = obj.createdOn;
  }

  public static create(dataStreamDetails: DataStreamDetailsType) {
    return new DataStreamDetails(dataStreamDetails);
  }
}
