/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { createSelector } from 'reselect';
import type { State } from '../types';
import type { SourcererModel, SourcererScopeName } from './model';

const selectSourcerer = (state: State): SourcererModel => state.sourcerer;

export const sourcererScopes = createSelector(
  selectSourcerer,
  (sourcerer) => sourcerer.sourcererScopes
);

export const sourcererScope = createSelector(
  sourcererScopes,
  (state: State, scopeId: SourcererScopeName) => scopeId,
  (scopes, scopeId) => scopes[scopeId]
);

export const sourcererScopeIsLoading = createSelector(sourcererScope, (scope) => scope.loading);

export const sourcererScopeSelectedDataViewId = createSelector(
  sourcererScope,
  (scope) => scope.selectedDataViewId
);

export const sourcererScopeSelectedPatterns = createSelector(
  sourcererScope,
  (scope) => scope.selectedPatterns
);

export const sourcererScopeMissingPatterns = createSelector(
  sourcererScope,
  (scope) => scope.missingPatterns
);

export const kibanaDataViews = createSelector(
  selectSourcerer,
  (sourcerer) => sourcerer.kibanaDataViews
);

export const defaultDataView = createSelector(
  selectSourcerer,
  (sourcerer) => sourcerer.defaultDataView
);

export const signalIndexName = createSelector(
  selectSourcerer,
  (sourcerer) => sourcerer.signalIndexName
);
