/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { InventoryMetrics } from '../../../types';
import { assetDetails } from './dashboards/asset_details';
import { formulas } from './formulas';

const dashboards = { assetDetails };

export const metrics: InventoryMetrics<{}, {}, typeof formulas, typeof dashboards> = {
  tsvb: {},
  snapshot: {},
  formulas,
  dashboards,
  defaultSnapshot: 'cpu',
  defaultTimeRangeInSeconds: 3600, // 1 hour
};
