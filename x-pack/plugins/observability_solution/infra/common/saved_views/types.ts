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

export type ServerError = IHttpFetchError<ResponseErrorBody>;

export interface SavedViewState<TView> {
  views?: SavedViewItem[];
  currentView?: TView | null;
  isCreatingView: boolean;
  isFetchingCurrentView: boolean;
  isFetchingViews: boolean;
  isUpdatingView: boolean;
}

export interface SavedViewOperations<
  TView extends { id: TView['id'] },
  TId extends TView['id'] = TView['id'],
  TPayload = any,
  TConfig = any
> {
  createView: UseMutateAsyncFunction<TView, ServerError, TPayload>;
  deleteViewById: UseMutateFunction<null, ServerError, string, MutationContext<TView>>;
  fetchViews: QueryObserverBaseResult<SavedViewItem[]>['refetch'];
  updateViewById: UseMutateAsyncFunction<TView, ServerError, UpdateViewParams<TPayload>>;
  switchViewById: (id: TId) => void;
  setDefaultViewById: UseMutateFunction<TConfig, ServerError, string, MutationContext<TView>>;
}

export interface SavedViewResult<
  TView extends {
    id: TView['id'];
  },
  TId extends string = '',
  TPayload = any,
  TConfig = any
> extends SavedViewState<TView>,
    SavedViewOperations<TView, TId, TPayload, TConfig> {}

export interface UpdateViewParams<TRequestPayload> {
  id: string;
  attributes: TRequestPayload;
}

export interface MutationContext<TView> {
  id?: string;
  previousViews?: TView[];
}

export interface BasicAttributes {
  name?: string;
  time?: number;
  isDefault?: boolean;
  isStatic?: boolean;
}
export interface SavedViewItem {
  id: string;
  attributes: BasicAttributes;
}
