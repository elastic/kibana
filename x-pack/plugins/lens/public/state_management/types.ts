/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { VisualizeFieldContext } from '@kbn/ui-actions-plugin/public';
import { EmbeddableEditorState } from '@kbn/embeddable-plugin/public';
import { Filter, Query } from '@kbn/es-query';
import { SavedQuery } from '@kbn/data-plugin/public';
import { Document } from '../persistence';

import type { TableInspectorAdapter } from '../editor_frame_service/types';
import { DateRange } from '../../common';
import { LensAppServices } from '../app_plugin/types';
import {
  DatasourceMap,
  VisualizationMap,
  SharingSavedObjectProps,
  VisualizeEditorContext,
  IndexPattern,
  IndexPatternRef,
} from '../types';
export interface VisualizationState {
  activeId: string | null;
  state: unknown;
}

export interface DataViewsState {
  indexPatternRefs: IndexPatternRef[];
  indexPatterns: Record<string, IndexPattern>;
  existingFields: Record<string, Record<string, boolean>>;
  isFirstExistenceFetch: boolean;
  existenceFetchFailed?: boolean;
  existenceFetchTimeout?: boolean;
}

export type DatasourceStates = Record<string, { isLoading: boolean; state: unknown }>;
export interface PreviewState {
  visualization: VisualizationState;
  datasourceStates: DatasourceStates;
  activeData?: TableInspectorAdapter;
  requestWarnings?: string[];
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

  isLoading: boolean;
  query: Query;
  filters: Filter[];
  savedQuery?: SavedQuery;
  searchSessionId: string;
  resolvedDateRange: DateRange;
  sharingSavedObjectProps?: Omit<SharingSavedObjectProps, 'sourceId'>;
  // Dataview/Indexpattern management has moved in here from datasource
  dataViews: DataViewsState;
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
