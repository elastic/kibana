/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Action } from '../state_management';
import {
  Visualization,
  FramePublicAPI,
  Datasource,
  DatasourceDimensionEditorProps,
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
}

export interface DimensionPopoverState {
  isOpen: boolean;
  openId: string | null;
  addingToGroupId: string | null;
  tabId: 'datasource' | 'visualization' | null;
}
