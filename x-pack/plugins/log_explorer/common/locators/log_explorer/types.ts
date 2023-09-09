/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DiscoverAppLocatorParams } from '@kbn/discover-plugin/common';
import type { DiscoverSetup } from '@kbn/discover-plugin/public';
import { SerializableRecord } from '@kbn/utility-types';

type DiscoverPropertiesToPick =
  | 'timeRange'
  | 'refreshInterval'
  | 'filters'
  | 'query'
  | 'columns'
  | 'sort';

export interface LogExplorerNavigationParams
  extends SerializableRecord,
    Pick<DiscoverAppLocatorParams, DiscoverPropertiesToPick> {}

export interface LogExplorerLocatorParams extends LogExplorerNavigationParams {
  /**
   * Dataset name to be selected.
   */
  dataset: string;
}

export interface LogExplorerLocatorDependencies {
  discover: DiscoverSetup;
}
