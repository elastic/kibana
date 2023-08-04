/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DiscoverAppLocatorParams } from '@kbn/discover-plugin/common';
import type { DiscoverSetup } from '@kbn/discover-plugin/public';

type DiscoverPropertiesToOmit =
  | 'savedSearchId'
  | 'dataViewId'
  | 'indexPatternId'
  | 'dataViewSpec'
  | 'profile';

type DiscoverLocatorUsableProperties = Omit<DiscoverAppLocatorParams, DiscoverPropertiesToOmit>;

export interface SingleDatasetLocatorParams extends DiscoverLocatorUsableProperties {
  /**
   * Integration name to be selected.
   */
  integration: string;
  /**
   * Datastream name to be selected.
   */
  dataStream: string;
}

export interface SingleDatasetLocatorDependencies {
  discover: DiscoverSetup;
}
