/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Dictionary } from '../../../../../../common/types/common';

type jobId = string;

export interface DataFrameJob {
  dest: string;
  id: jobId;
  source: string;
}

export interface DataFrameJobListRow {
  state: Dictionary<any>;
  stats: Dictionary<any>;
  config: DataFrameJob;
}

// Used to pass on attribute names to table columns
export enum DataFrameJobListColumn {
  configDest = 'config.dest',
  configSource = 'config.source',
  id = 'id',
}

export type ItemIdToExpandedRowMap = Dictionary<JSX.Element>;
