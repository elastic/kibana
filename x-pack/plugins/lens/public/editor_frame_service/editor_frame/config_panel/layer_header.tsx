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
  Visualization,
  VisualizationLayerWidgetProps,
  VisualizationMap,
} from '../../../types';
import { ChartSwitch } from '../workspace_panel/chart_switch';

export function LayerHeader({
  activeVisualization,
  layerConfigProps,
  visualizationMap,
  datasourceMap,
  onlyAllowSwitchToSubtypes,
}: {
  visualizationMap: VisualizationMap;
  datasourceMap: DatasourceMap;
  activeVisualization: Visualization;
  layerConfigProps: VisualizationLayerWidgetProps;
  onlyAllowSwitchToSubtypes?: boolean;
}) {
  const customLayerHeader = activeVisualization.getCustomLayerHeader?.(layerConfigProps);
  if (customLayerHeader) {
    return customLayerHeader;
  }

  let availableVisualizationMap = { ...visualizationMap };

  // hides legacy metric for ES|QL charts
  Object.keys(availableVisualizationMap).forEach((key) => {
    if (availableVisualizationMap[key]?.hideFromChartSwitch?.(layerConfigProps.frame)) {
      delete availableVisualizationMap[key];
    }
  });

  // TODO: for Discover, we should only show the active visualization subtypes till we fix how the communication with Discover works
  if (onlyAllowSwitchToSubtypes) {
    availableVisualizationMap = {
      [activeVisualization.id]: availableVisualizationMap[activeVisualization.id],
    };
  }

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
