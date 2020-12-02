/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export interface OverallStats {
  totalCount: number;
  aggregatableExistsFields: any[];
  aggregatableNotExistsFields: any[];
  nonAggregatableExistsFields: any[];
  nonAggregatableNotExistsFields: any[];
}
