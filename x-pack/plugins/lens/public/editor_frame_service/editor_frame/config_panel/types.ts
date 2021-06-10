/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Action } from '../state_management';
import {
  Visualization,
  FramePublicAPI,
  Datasource,
  DatasourceDimensionEditorProps,
  VisualizationDimensionGroupConfig,
} from '../../../types';
export interface ConfigPanelWrapperProps {
  activeDatasourceId: string;
  visualizationState: unknown;
  visualizationMap: Record<string, Visualization>;
  activeVisualizationId: string | null;
  dispatch: (action: Action) => void;
  framePublicAPI: FramePublicAPI;
  datasourceMap: Record<string, Datasource>;
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
  datasourceMap: Record<string, Datasource>;
  activeVisualization: Visualization;
  dispatch: (action: Action) => void;
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
