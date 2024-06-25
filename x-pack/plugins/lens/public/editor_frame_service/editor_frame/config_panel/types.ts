/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';
import type { UiActionsStart } from '@kbn/ui-actions-plugin/public';
import { DragDropIdentifier, DropType } from '@kbn/dom-drag-drop';
import type { IndexPatternServiceAPI } from '../../../data_views_service/service';

import {
  Visualization,
  FramePublicAPI,
  DatasourceDimensionEditorProps,
  DatasourceMap,
  VisualizationMap,
  UserMessagesGetter,
  AddLayerFunction,
  RegisterLibraryAnnotationGroupFunction,
  StateSetter,
  DragDropOperation,
  VisualizationDimensionGroupConfig,
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
  setIsInlineFlyoutVisible?: (status: boolean) => void;
  onlyAllowSwitchToSubtypes?: boolean;
}

export interface LayerPanelProps {
  visualizationState: unknown;
  datasourceMap: DatasourceMap;
  visualizationMap: VisualizationMap;
  framePublicAPI: FramePublicAPI;
  core: DatasourceDimensionEditorProps['core'];
  activeVisualization: Visualization;
  dimensionGroups: VisualizationDimensionGroupConfig[];
  layerId: string;
  layerIndex: number;
  isOnlyLayer: boolean;
  addLayer: AddLayerFunction;
  registerLibraryAnnotationGroup: RegisterLibraryAnnotationGroupFunction;
  updateVisualization: StateSetter<unknown>;
  onDropToDimension: (payload: {
    source: DragDropIdentifier;
    target: DragDropOperation;
    dropType: DropType;
  }) => void;
  updateDatasource: (
    datasourceId: string | undefined,
    newState: unknown,
    dontSyncLinkedDimensions?: boolean
  ) => void;
  updateDatasourceAsync: (datasourceId: string | undefined, newState: unknown) => void;
  updateAll: (
    datasourceId: string | undefined,
    newDatasourcestate: unknown,
    newVisualizationState: unknown
  ) => void;
  onRemoveLayer: (layerId: string) => void;
  onCloneLayer: () => void;
  onRemoveDimension: (props: { columnId: string; layerId: string }) => void;
  registerNewLayerRef: (layerId: string, instance: HTMLDivElement | null) => void;
  toggleFullscreen: () => void;
  onEmptyDimensionAdd: (columnId: string, group: { groupId: string }) => void;
  onChangeIndexPattern: (args: {
    indexPatternId: string;
    layerId: string;
    datasourceId?: string;
    visualizationId?: string;
  }) => void;
  indexPatternService?: IndexPatternServiceAPI;
  getUserMessages?: UserMessagesGetter;
  displayLayerSettings: boolean;
  setIsInlineFlyoutVisible?: (status: boolean) => void;
  onlyAllowSwitchToSubtypes?: boolean;
}

export interface LayerDatasourceDropProps {
  state: unknown;
  setState: (newState: unknown) => void;
}
