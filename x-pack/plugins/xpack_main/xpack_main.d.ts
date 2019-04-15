/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Feature, FeatureWithAllOrReadPrivileges } from './server/lib/feature_registry';
import { XPackInfo, XPackInfoOptions } from './server/lib/xpack_info';
import { XPackUsage } from './server/lib/xpack_usage';
export { XPackFeature } from './server/lib/xpack_info';

export interface XPackMainPlugin {
  info: XPackInfo;
  usage: XPackUsage;
  createXPackInfo(options: XPackInfoOptions): XPackInfo;
  getFeatures(): Feature[];
  registerFeature(feature: FeatureWithAllOrReadPrivileges): void;
}
