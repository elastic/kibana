/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Feature } from 'x-pack/plugins/xpack_main/types';

import { Space } from 'x-pack/plugins/spaces/common/model/space';

export function getEnabledFeatures(features: Feature[], space: Partial<Space>) {
  return features.filter(feature => !(space.disabledFeatures || []).includes(feature.id));
}
