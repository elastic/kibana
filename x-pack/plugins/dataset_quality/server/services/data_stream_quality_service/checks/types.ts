/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ISearchGeneric } from '@kbn/data-plugin/common';
import type { CheckResult, DataStreamQualityCheckArguments } from '../../../../common';

export interface DataStreamQualityCheck {
  id: string;
  apply: (
    dependencies: DataStreamQualityCheckDependencies
  ) => (args: DataStreamQualityCheckArguments) => Promise<CheckResult>;
}

export interface DataStreamQualityCheckDependencies {
  search: ISearchGeneric;
}

export { DataStreamQualityCheckArguments };
