/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { Filter } from '../../../../../src/plugins/data/common/es_query';
import type { Query } from '../../../../../src/plugins/data/public';
import type { SavedQuery } from '../../../../../src/plugins/data/public/query/saved_query/types';
import type { EmbeddableEditorState } from '../../../../../src/plugins/embeddable/public/lib/state_transfer/types';
import type { VisualizeFieldContext } from '../../../../../src/plugins/ui_actions/public/types';
import type { DateRange } from '../../common/types';
import type { LensAppServices } from '../app_plugin/types';
import type { TableInspectorAdapter } from '../editor_frame_service/types';
import type { Document } from '../persistence/saved_object_store';
import type { DatasourceMap, VisualizationMap } from '../types';

export interface VisualizationState {
  activeId: string | null;
  state: unknown;
}

export type DatasourceStates = Record<string, { state: unknown; isLoading: boolean }>;
export interface PreviewState {
  visualization: VisualizationState;
  datasourceStates: DatasourceStates;
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
