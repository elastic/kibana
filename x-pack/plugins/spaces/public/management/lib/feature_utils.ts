/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { KibanaFeatureConfig } from '../../../../features/common';

import { Space } from '../..';

export function getEnabledFeatures(features: KibanaFeatureConfig[], space: Partial<Space>) {
  return features.filter((feature) => !(space.disabledFeatures || []).includes(feature.id));
}
