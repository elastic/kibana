/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  Visualization,
  FramePublicAPI,
  DatasourceDimensionEditorProps,
  VisualizationDimensionGroupConfig,
  DatasourceMap,
} from '../../../types';
export interface ConfigPanelWrapperProps {
  activeDatasourceId: string;
  visualizationState: unknown;
  activeVisualization: Visualization | null;
  framePublicAPI: FramePublicAPI;
  datasourceMap: DatasourceMap;
  datasourceStates: Record<
    string,
    {
      isLoading: boolean;
      state: unknown;
    }
  >;
  core: DatasourceDimensionEditorProps['core'];
  isFullscreen: boolean;
}

export interface LayerPanelProps {
  activeDatasourceId: string;
  visualizationState: unknown;
  datasourceMap: DatasourceMap;
  activeVisualization: Visualization;
  framePublicAPI: FramePublicAPI;
  datasourceStates: Record<
    string,
    {
      isLoading: boolean;
      state: unknown;
    }
  >;
  core: DatasourceDimensionEditorProps['core'];
  isFullscreen: boolean;
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
