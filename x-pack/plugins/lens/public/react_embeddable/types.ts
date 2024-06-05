/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { DefaultEmbeddableApi } from '@kbn/embeddable-plugin/public';
import { Filter, Query, TimeRange } from '@kbn/es-query';
import { HasInspectorAdapters, InspectorOptions } from '@kbn/inspector-plugin/public';
import {
  HasEditCapabilities,
  HasLibraryTransforms,
  HasParentApi,
  HasSupportedTriggers,
  PublishesDataLoading,
  PublishesUnifiedSearch,
  SerializedTitles,
} from '@kbn/presentation-publishing';
// import { HasDynamicActions } from '@kbn/embeddable-enhanced-plugin/public';
import { DynamicActionsSerializedState } from '@kbn/embeddable-enhanced-plugin/public/plugin';
import {
  BrushTriggerEvent,
  ClickTriggerEvent,
  MultiClickTriggerEvent,
} from '@kbn/charts-plugin/public';
import { PaletteOutput } from '@kbn/coloring';
import { DefaultInspectorAdapters, RenderMode } from '@kbn/expressions-plugin/common';
import { BehaviorSubject, type Observable } from 'rxjs';
import { OverlayRef } from '@kbn/core/public';
import { LensSavedObjectAttributes, ViewUnderlyingDataArgs } from '../embeddable';
import { LensTableRowContextMenuEvent } from '../types';

export interface InitializeReturnValue<T extends keyof LensApi, A extends unknown> {
  cleanup?: () => void;
  api: Record<T, LensApi[T]>;
  comparators: [BehaviorSubject<A>, (nextValue: A) => void];
}

interface PreventableEvent {
  preventDefault(): void;
}

export type Simplify<T> = { [KeyType in keyof T]: T[KeyType] } & {};

/**
 * Lens embeddable props broken down by type
 */

interface LensPropsVariants {
  // by-value
  attributes?: Simplify<LensSavedObjectAttributes>;
  // by-reference
  savedObjectId?: string;
}

export interface LensCallbacks {
  onBrushEnd?: (data: Simplify<BrushTriggerEvent['data'] & PreventableEvent>) => void;
  onLoad?: (isLoading: boolean, adapters?: Partial<DefaultInspectorAdapters>) => void;
  onFilter?: (
    data: Simplify<(ClickTriggerEvent['data'] | MultiClickTriggerEvent['data']) & PreventableEvent>
  ) => void;
  onTableRowClick?: (
    data: Simplify<LensTableRowContextMenuEvent['data'] & PreventableEvent>
  ) => void;
}

export interface LensApiCallbacks {
  getSavedVis: () => Readonly<LensSavedObjectAttributes | undefined>;
  canViewUnderlyingData: () => Promise<boolean>;
  getViewUnderlyingDataArgs: () => ViewUnderlyingDataArgs;
}

interface LensKibanaContextProps {
  filters?: Filter[];
  query?: Query;
  timeRange?: TimeRange;
  timeslice?: [number, number];
  palette?: PaletteOutput;
}

interface LensPanelStyleProps {
  renderMode?: RenderMode;
  style?: React.CSSProperties;
  className?: string;
  noPadding?: boolean;
}

interface LensRequestHandlersProps {
  abortController?: AbortController;
}

/**
 * Compose together all the props and make them inspectable via Simplify
 */
export type LensSerializedState = LensPropsVariants &
  LensKibanaContextProps &
  LensPanelStyleProps &
  LensRequestHandlersProps &
  SerializedTitles &
  Partial<DynamicActionsSerializedState>;

type LensInspectorAdapters = Simplify<
  HasInspectorAdapters & {
    inspect: (options?: InspectorOptions) => OverlayRef;
    close: () => Promise<void>;
  }
>;

export type LensApi = Simplify<
  DefaultEmbeddableApi<LensSerializedState> &
    Partial<HasEditCapabilities> &
    LensInspectorAdapters &
    HasSupportedTriggers &
    PublishesDataLoading &
    Partial<HasParentApi<unknown>> &
    LensApiCallbacks & {
      onRenderComplete$: Observable<void>;
    }
>;

export type LensBasicState = Simplify<LensPropsVariants & SerializedTitles>;
export type LensBasicApi = Simplify<
  DefaultEmbeddableApi<LensBasicState> & Partial<HasParentApi<unknown>>
>;

export interface InitializerResult {
  api: Record<string, unknown>;
  comparators: Record<string, unknown>;
  attributes: Record<string, unknown>;
}
