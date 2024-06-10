/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ManagementAppLocatorParams } from '@kbn/management-plugin/common/locator';
import { LocatorPublic } from '@kbn/share-plugin/common';
import { SerializableRecord } from '@kbn/utility-types';

export const DATA_QUALITY_LOCATOR_ID = 'DATA_QUALITY_LOCATOR';

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
type RefreshInterval = {
  pause: boolean;
  value: number;
};

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
type TimeRangeConfig = {
  from: string;
  to: string;
  refresh: RefreshInterval;
};

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
type Filters = {
  timeRange: TimeRangeConfig;
};

export interface DataQualityLocatorParams extends SerializableRecord {
  filters?: Filters;
}

export interface DataQualityLocatorDependencies {
  useHash: boolean;
  managementLocator: LocatorPublic<ManagementAppLocatorParams>;
}
