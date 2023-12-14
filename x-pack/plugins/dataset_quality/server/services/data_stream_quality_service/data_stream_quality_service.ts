/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ISearchGeneric } from '@kbn/data-plugin/common';
import { checkForIgnoredFields, DataStreamQualityCheck } from './checks';

export class DataStreamQualityService {
  private checks: DataStreamQualityCheck[] = [checkForIgnoredFields];

  constructor(private readonly search: ISearchGeneric) {}

  public async performChecks() {
    return null;
  }
}
