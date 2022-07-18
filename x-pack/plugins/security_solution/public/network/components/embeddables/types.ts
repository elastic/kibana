/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RenderTooltipContentParams } from '@kbn/maps-plugin/public';

export interface IndexPatternMapping {
  title: string;
  id: string;
}

export interface LayerMappingDetails {
  metricField: string;
  geoField: string;
  tooltipProperties: string[];
  label: string;
}

export interface LayerMapping {
  source: LayerMappingDetails;
  destination: LayerMappingDetails;
}

export interface LayerMappingCollection {
  [indexPatternTitle: string]: LayerMapping;
}

export interface MapFeature {
  id: number;
  layerId: string;
}

export interface FeatureGeometry {
  coordinates: [number];
  type: string;
}

export type MapToolTipProps = Partial<RenderTooltipContentParams>;
