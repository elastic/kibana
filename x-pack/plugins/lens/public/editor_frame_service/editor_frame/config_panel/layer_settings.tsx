/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { NativeRenderer } from '../../../native_renderer';
import { Visualization, VisualizationLayerWidgetProps } from '../../../types';
import { StaticHeader } from '../../../shared_components';

export function LayerSettings({
  activeVisualization,
  layerConfigProps,
}: {
  activeVisualization: Visualization;
  layerConfigProps: VisualizationLayerWidgetProps;
}) {
  if (!activeVisualization.renderLayerHeader) {
    const description = activeVisualization.getDescription(layerConfigProps.state);
    if (!description) {
      return null;
    }
    return <StaticHeader label={description.label} icon={description.icon} />;
  }

  return (
    <NativeRenderer render={activeVisualization.renderLayerHeader} nativeProps={layerConfigProps} />
  );
}
