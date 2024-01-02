/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ISearchGeneric } from '@kbn/data-plugin/common';

export interface DataStreamQualityCheck {
  id: string;
  apply: (
    dependencies: DataStreamQualityCheckDependencies
  ) => (args: DataStreamQualityCheckArguments) => Promise<QualityCheckResult>;
}

export type QualityCheckResult = CheckPassedResult | CheckFailedResult;

interface CheckPassedResult {
  type: 'passed';
}

interface CheckFailedResult {
  type: 'failed';
  reasons: null;
}

interface DataStreamQualityCheckDependencies {
  search: ISearchGeneric;
}

interface DataStreamQualityCheckArguments {
  dataStream: string;
  timeRange: {
    start: string;
    end: string;
  };
}
