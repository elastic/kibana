/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiSpacer, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { VisualizationToolbar } from '../../../editor_frame_service/editor_frame/workspace_panel';
import { ConfigPanelWrapper } from '../../../editor_frame_service/editor_frame/config_panel/config_panel';
import type { LayerConfigurationProps } from './types';

export function LayerConfiguration({
  attributes,
  coreStart,
  startDependencies,
  visualizationMap,
  datasourceMap,
  datasourceId,
  framePublicAPI,
}: LayerConfigurationProps) {
  const activeVisualization = visualizationMap[attributes.visualizationType];

  const layerPanelsProps = {
    framePublicAPI,
    datasourceMap,
    visualizationMap,
    core: coreStart,
    dataViews: startDependencies.dataViews,
    uiActions: startDependencies.uiActions,
    hideLayerHeader: datasourceId === 'textBased',
  };
  return (
    <EuiFlexGroup gutterSize="s">
      <EuiFlexItem>
        <EuiSpacer size="m" />
        <VisualizationToolbar
          activeVisualization={activeVisualization}
          framePublicAPI={framePublicAPI}
        />
        <EuiSpacer size="m" />
        <ConfigPanelWrapper {...layerPanelsProps} />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
