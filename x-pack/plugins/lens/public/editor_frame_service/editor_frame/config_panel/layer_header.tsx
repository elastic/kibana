/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { StaticHeader } from '../../../shared_components';
import {
  DatasourceMap,
  FramePublicAPI,
  VisualizationLayerWidgetProps,
  VisualizationMap,
} from '../../../types';
import { ChartSwitch } from './chart_switch';

export function LayerHeader({
  activeVisualizationId,
  layerConfigProps,
  visualizationMap,
  datasourceMap,
  onlyAllowSwitchToSubtypes,
}: {
  visualizationMap: VisualizationMap;
  datasourceMap: DatasourceMap;
  activeVisualizationId: string;
  layerConfigProps: VisualizationLayerWidgetProps;
  onlyAllowSwitchToSubtypes?: boolean;
}) {
  const activeVisualization = visualizationMap[activeVisualizationId];
  if (!activeVisualization) {
    return null;
  }
  const customLayerHeader = activeVisualization.getCustomLayerHeader?.(layerConfigProps);
  if (customLayerHeader) {
    return customLayerHeader;
  }

  const availableVisualizationMap = filterVisualizationMap(
    visualizationMap,
    activeVisualization.id,
    layerConfigProps.frame,
    onlyAllowSwitchToSubtypes
  );

  const hasOnlyOneVisAvailable =
    Object.keys(availableVisualizationMap).length === 1 &&
    Object.values(availableVisualizationMap)[0].visualizationTypes.length === 1;

  if (hasOnlyOneVisAvailable) {
    const description = activeVisualization.getDescription(layerConfigProps.state);
    return <StaticHeader label={description.label} icon={description.icon} />;
  }

  return (
    <ChartSwitch
      datasourceMap={datasourceMap}
      visualizationMap={availableVisualizationMap}
      framePublicAPI={layerConfigProps.frame}
      layerId={layerConfigProps.layerId}
    />
  );
}

const filterVisualizationMap = (
  visualizationMap: VisualizationMap,
  activeVisualizationId: string,
  frame: FramePublicAPI,
  onlyAllowSwitchToSubtypes?: boolean
) => {
  // TODO: for Discover, we should only show the active visualization subtypes till we fix how the communication with Discover works
  if (onlyAllowSwitchToSubtypes) {
    return {
      [activeVisualizationId]: visualizationMap[activeVisualizationId],
    };
  }

  const availableVisualizationMap = { ...visualizationMap };

  // hides legacy metric for ES|QL charts
  Object.keys(availableVisualizationMap).forEach((key) => {
    if (availableVisualizationMap[key]?.hideFromChartSwitch?.(frame)) {
      delete availableVisualizationMap[key];
    }
  });

  return availableVisualizationMap;
};
