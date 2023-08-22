/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';
import type { UiActionsStart } from '@kbn/ui-actions-plugin/public';
import type { IndexPatternServiceAPI } from '../../../data_views_service/service';

import {
  Visualization,
  FramePublicAPI,
  DatasourceDimensionEditorProps,
  VisualizationDimensionGroupConfig,
  DatasourceMap,
  VisualizationMap,
  UserMessagesGetter,
} from '../../../types';

export interface ConfigPanelWrapperProps {
  framePublicAPI: FramePublicAPI;
  datasourceMap: DatasourceMap;
  visualizationMap: VisualizationMap;
  core: DatasourceDimensionEditorProps['core'];
  dataViews: DataViewsPublicPluginStart;
  indexPatternService?: IndexPatternServiceAPI;
  uiActions: UiActionsStart;
  getUserMessages?: UserMessagesGetter;
  hideLayerHeader?: boolean;
}

export interface LayerPanelProps {
  visualizationState: unknown;
  datasourceMap: DatasourceMap;
  activeVisualization: Visualization;
  framePublicAPI: FramePublicAPI;
  core: DatasourceDimensionEditorProps['core'];
}

export interface LayerDatasourceDropProps {
  state: unknown;
  setState: (newState: unknown) => void;
}

export interface ActiveDimensionState {
  isNew: boolean;
  activeId?: string;
  activeGroup?: VisualizationDimensionGroupConfig;
}
