/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { VisualizeFieldContext } from '@kbn/ui-actions-plugin/public';
import { EmbeddableEditorState } from '@kbn/embeddable-plugin/public';
import { Filter } from '@kbn/es-query';
import { Query, SavedQuery } from '@kbn/data-plugin/public';
import { Document } from '../persistence';

import { TableInspectorAdapter } from '../editor_frame_service/types';
import { DateRange } from '../../common';
import { LensAppServices } from '../app_plugin/types';
import {
  DatasourceMap,
  VisualizationMap,
  SharingSavedObjectProps,
  VisualizeEditorContext,
} from '../types';
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
  autoApplyDisabled?: boolean;
  applyChangesCounter?: number;
  changesApplied?: boolean;
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
  sharingSavedObjectProps?: Omit<SharingSavedObjectProps, 'sourceId'>;
}

export type DispatchSetState = (state: Partial<LensAppState>) => {
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
  initialContext?: VisualizeFieldContext | VisualizeEditorContext;
  embeddableEditorIncomingState?: EmbeddableEditorState;
}
