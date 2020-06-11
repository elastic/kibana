/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { InfraWaffleMapBounds } from '../../../../lib/lib';
export const convertBoundsToPercents = (bounds: InfraWaffleMapBounds) => ({
  min: bounds.min * 100,
  max: (bounds.max || 1) * 100,
});
