/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DatasourceStates } from '../../../state_management';
import {
  Visualization,
  FramePublicAPI,
  DatasourceDimensionEditorProps,
  VisualizationDimensionGroupConfig,
  DatasourceMap,
  VisualizationMap,
} from '../../../types';
export interface ConfigPanelWrapperProps {
  activeDatasourceId: string;
  visualizationState: unknown;
  activeVisualization: Visualization | null;
  framePublicAPI: FramePublicAPI;
  datasourceMap: DatasourceMap;
  visualizationMap: VisualizationMap;
  datasourceStates: DatasourceStates;
  core: DatasourceDimensionEditorProps['core'];
  isFullscreen: boolean;
}

export interface LayerPanelProps {
  activeDatasourceId: string;
  visualizationState: unknown;
  datasourceStates: DatasourceStates;
  isFullscreen: boolean;
  datasourceMap: DatasourceMap;
  activeVisualization: Visualization;
  framePublicAPI: FramePublicAPI;
  core: DatasourceDimensionEditorProps['core'];
}

export interface LayerDatasourceDropProps {
  layerId: string;
  state: unknown;
  setState: (newState: unknown) => void;
}

export interface ActiveDimensionState {
  isNew: boolean;
  activeId?: string;
  activeGroup?: VisualizationDimensionGroupConfig;
}
