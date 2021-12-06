/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ObservabilityIndexPatterns } from '../../../components/shared/exploratory_view/utils/observability_index_patterns';

interface PanelCoordinates {
  x: number;
  y: number;
  w: number;
  h: number;
}

export type ObsPanel = (
  observabilityDataViews: ObservabilityIndexPatterns,
  id: number,
  coordinates: PanelCoordinates
) => Promise<any>;
