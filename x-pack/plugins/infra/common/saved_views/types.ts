/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  QueryObserverBaseResult,
  UseMutateAsyncFunction,
  UseMutateFunction,
} from '@tanstack/react-query';

import { IHttpFetchError, ResponseErrorBody } from '@kbn/core-http-browser';
import { MetricsExplorerViewAttributes } from '../metrics_explorer_views';
import { InventoryViewAttributes } from '../inventory_views';

export type ServerError = IHttpFetchError<ResponseErrorBody>;

export interface SavedViewState<TView> {
  views?: TView[];
  currentView?: TView | null;
  isCreatingView: boolean;
  isFetchingCurrentView: boolean;
  isFetchingViews: boolean;
  isUpdatingView: boolean;
}

export interface SavedViewResult<
  TView,
  TId extends string = any,
  TRequestPayload = any,
  TSourceConfig = any
> extends SavedViewState<TView> {
  createView: UseMutateAsyncFunction<TView, ServerError, TRequestPayload>;
  deleteViewById: UseMutateFunction<null, ServerError, string, MutationContext<TView>>;
  fetchViews: QueryObserverBaseResult<TView[]>['refetch'];
  updateViewById: UseMutateAsyncFunction<TView, ServerError, UpdateViewParams<TRequestPayload>>;
  switchViewById: (id: TId) => void;
  setDefaultViewById: UseMutateFunction<TSourceConfig, ServerError, string, MutationContext<TView>>;
}

export interface UpdateViewParams<TRequestPayload> {
  id: string;
  attributes: TRequestPayload;
}

export interface MutationContext<TView> {
  id?: string;
  previousViews?: TView[];
}

export interface SavedViewAttribute
  extends MetricsExplorerViewAttributes,
    InventoryViewAttributes {}
export interface SavedViewBasicState<TSavedViewAttribute> {
  id: string;
  attributes: TSavedViewAttribute & {
    name: string;
    time?: number;
    isStatic: boolean;
    isDefault: boolean;
  };
}
