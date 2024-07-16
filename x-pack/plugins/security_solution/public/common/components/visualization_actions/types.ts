/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  DatatableVisualizationState,
  FieldBasedIndexPatternColumn,
  FormBasedPersistedState,
  TypedLensByValueInput,
} from '@kbn/lens-plugin/public';
import type { DataViewSpec } from '@kbn/data-views-plugin/common';
import type { Action } from '@kbn/ui-actions-plugin/public';
import type { Filter, Query } from '@kbn/es-query';

import type { LensProps } from '@kbn/cases-plugin/public/types';
import type { InputsModelId } from '../../store/inputs/constants';
import type { SourcererScopeName } from '../../../sourcerer/store/model';
import type { Status } from '../../../../common/api/detection_engine';

export type LensAttributes = TypedLensByValueInput['attributes'];
export type GetLensAttributes = (
  stackByField?: string,
  extraOptions?: ExtraOptions
) => LensAttributes;

export interface UseLensAttributesProps {
  applyGlobalQueriesAndFilters?: boolean;
  applyPageAndTabsFilters?: boolean;
  extraOptions?: ExtraOptions;
  getLensAttributes?: GetLensAttributes;
  lensAttributes?: LensAttributes | null;
  scopeId?: SourcererScopeName;
  stackByField?: string;
  title?: string;
}

export enum VisualizationContextMenuActions {
  addToExistingCase = 'addToExistingCase',
  addToNewCase = 'addToNewCase',
  inspect = 'inspect',
  openInLens = 'openInLens',
  saveToLibrary = 'saveToLibrary',
}

export interface VisualizationActionsProps {
  applyGlobalQueriesAndFilters?: boolean;
  className?: string;
  extraActions?: Action[];
  extraOptions?: ExtraOptions;
  getLensAttributes?: GetLensAttributes;
  inputId?: InputsModelId.global | InputsModelId.timeline;
  inspectIndex?: number;
  isInspectButtonDisabled?: boolean;
  isMultipleQuery?: boolean;
  lensAttributes?: LensAttributes | null;
  onCloseInspect?: () => void;
  queryId: string;
  scopeId?: SourcererScopeName;
  stackByField?: string;
  timerange: { from: string; to: string };
  title: React.ReactNode;
  withActions?: VisualizationContextMenuActions[];
  casesAttachmentMetadata?: LensProps['metadata'];
}

export interface EmbeddableData {
  requests: string[];
  responses: string[];
  isLoading: boolean;
}

export type OnEmbeddableLoaded = (data: EmbeddableData) => void;

export enum VisualizationContextMenuDefaultActionName {
  addToExistingCase = 'addToExistingCase',
  addToNewCase = 'addToNewCase',
  inspect = 'inspect',
  openInLens = 'openInLens',
  saveToLibrary = 'saveToLibrary',
}

export interface LensEmbeddableComponentProps {
  applyGlobalQueriesAndFilters?: boolean;
  applyPageAndTabsFilters?: boolean;
  extraActions?: Action[];
  extraOptions?: ExtraOptions;
  getLensAttributes?: GetLensAttributes;
  height?: number; // px
  id: string;
  inputsModelId?: InputsModelId.global | InputsModelId.timeline;
  inspectTitle?: React.ReactNode;
  lensAttributes?: LensAttributes;
  onLoad?: OnEmbeddableLoaded;
  enableLegendActions?: boolean;
  scopeId?: SourcererScopeName;
  stackByField?: string;
  timerange: { from: string; to: string };
  width?: string | number;
  withActions?: VisualizationContextMenuActions[];
  /**
   * Disable the on click filter for the visualization.
   */
  disableOnClickFilter?: boolean;

  /**
   * Metadata for cases Attachable visualization.
   */
  casesAttachmentMetadata?: LensProps['metadata'];
}

export enum RequestStatus {
  PENDING, // The request hasn't finished yet.
  OK, // The request has successfully finished.
  ERROR, // The request failed.
}

export interface Request extends RequestParams {
  id: string;
  name: string;
  json?: object;
  response?: Response;
  startTime: number;
  stats?: RequestStatistics;
  status: RequestStatus;
  time?: number;
}

export interface RequestParams {
  id?: string;
  description?: string;
  searchSessionId?: string;
}

export interface RequestStatistics {
  indexFilter: RequestStatistic;
}

export interface RequestStatistic {
  label: string;
  description?: string;
  value: string;
}

export interface Response {
  json?: { rawResponse?: object };
  time?: number;
}

export interface ExtraOptions {
  breakdownField?: string;
  dnsIsPtrIncluded?: boolean;
  filters?: Filter[];
  ruleId?: string;
  showLegend?: boolean;
  spaceId?: string;
  status?: Status;
}

export interface VisualizationEmbeddableProps extends LensEmbeddableComponentProps {
  donutTextWrapperClassName?: string;
  inputId?: InputsModelId.global | InputsModelId.timeline;
  isDonut?: boolean;
  label?: string;
}

export interface VisualizationResponse<Hit = {}, Aggregations = {} | undefined> {
  took: number;
  _shards: {
    total: number;
    successful: number;
    skipped: number;
    failed: number;
  };
  aggregations?: Aggregations;
  hits: {
    total: number;
    hits: Hit[];
  };
}

export interface SavedObjectReference {
  id: string;
  name: string;
  type: string;
}

export interface LensDataTableAttributes<TVisType, TVisState> {
  description?: string;
  references: SavedObjectReference[];
  visualizationType: TVisType;
  state: {
    query: Query;
    globalPalette?: {
      activePaletteId: string;
      state?: unknown;
    };
    filters: Filter[];
    adHocDataViews?: Record<string, DataViewSpec>;
    internalReferences?: SavedObjectReference[];
    datasourceStates: {
      formBased: FormBasedPersistedState;
    };
    visualization: TVisState;
  };
  title: string;
}

export interface LensDataTableEmbeddable {
  attributes: LensDataTableAttributes<'lnsDatatable', DatatableVisualizationState>;
  id: string;
  timeRange: { from: string; to: string; fromStr: string; toStr: string };
}

export interface LensEmbeddableDataTableColumn extends FieldBasedIndexPatternColumn {
  operationType: string;
  params?: unknown;
}
