/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { VisualizationState } from '../state_management';
import type { VisualizationMap, Datasource, FeatureBadge } from '../types';

export const getApplicationFeatureBadges = ({
  visualizationType,
  visualization,
  visualizationMap,
  activeDatasource,
  activeDatasourceState,
}: {
  visualizationType: string | null | undefined;
  visualization: VisualizationState | undefined;
  visualizationMap: VisualizationMap;
  activeDatasource: Datasource | null | undefined;
  activeDatasourceState: { state: unknown } | null;
}): FeatureBadge[] => {
  const dataFeatures =
    activeDatasource?.getNotifiableFeatures?.(activeDatasourceState?.state) || [];
  const visualizationFeatures = visualization?.activeId
    ? visualizationMap[visualization.activeId]?.getNotifiableFeatures?.(visualization.state) || []
    : [];
  return [...visualizationFeatures, ...dataFeatures];
};
