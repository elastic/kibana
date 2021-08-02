/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { VisualizeFieldContext } from 'src/plugins/ui_actions/public';
import { EmbeddableEditorState } from 'src/plugins/embeddable/public';
import { Filter, Query, SavedQuery } from '../../../../../src/plugins/data/public';
import { Document } from '../persistence';

import { TableInspectorAdapter } from '../editor_frame_service/types';
import { DateRange } from '../../common';
import { LensAppServices } from '../app_plugin/types';
import { DatasourceMap, VisualizationMap } from '../types';

export interface PreviewState {
  visualization: {
    activeId: string | null;
    state: unknown;
  };
  datasourceStates: Record<string, { state: unknown; isLoading: boolean }>;
}
export interface EditorFrameState extends PreviewState {
  activeDatasourceId: string | null;
  stagedPreview?: PreviewState;
  isFullscreenDatasource?: boolean;
}
export interface LensAppState extends EditorFrameState {
  persistedDoc?: Document;

  // Determines whether the lens editor shows the 'save and return' button, and the originating app breadcrumb.
  isLinkedToOriginatingApp?: boolean;
  isSaveable: boolean;
  activeData?: TableInspectorAdapter;

  isLoading: boolean;
  query: Query;
  filters: Filter[];
  savedQuery?: SavedQuery;
  searchSessionId: string;
  resolvedDateRange: DateRange;
}

export type DispatchSetState = (
  state: Partial<LensAppState>
) => {
  payload: Partial<LensAppState>;
  type: string;
};

export interface LensState {
  lens: LensAppState;
}

export interface LensStoreDeps {
  lensServices: LensAppServices;
  datasourceMap: DatasourceMap;
  visualizationMap: VisualizationMap;
  initialContext?: VisualizeFieldContext;
  embeddableEditorIncomingState?: EmbeddableEditorState;
}
