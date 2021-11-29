/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createSelector } from 'reselect';
import { State } from '../types';
import {
  SourcererDataView,
  SourcererModel,
  SourcererScope,
  SourcererScopeById,
  SourcererScopeName,
} from './model';

export const sourcererKibanaDataViewsSelector = ({
  sourcerer,
}: State): SourcererModel['kibanaDataViews'] => sourcerer.kibanaDataViews;

export const sourcererSignalIndexNameSelector = ({ sourcerer }: State): string | null =>
  sourcerer.signalIndexName;

export const sourcererDefaultDataViewSelector = ({
  sourcerer,
}: State): SourcererModel['defaultDataView'] => sourcerer.defaultDataView;

export const dataViewSelector = (
  { sourcerer }: State,
  id: string | null
): SourcererDataView | undefined =>
  sourcerer.kibanaDataViews.find((dataView) => dataView.id === id);

export const sourcererScopeIdSelector = (
  { sourcerer }: State,
  scopeId: SourcererScopeName
): SourcererScope => sourcerer.sourcererScopes[scopeId];

export const scopeIdSelector = () => createSelector(sourcererScopeIdSelector, (scope) => scope);

export const sourcererScopesSelector = ({ sourcerer }: State): SourcererScopeById =>
  sourcerer.sourcererScopes;

export const scopesSelector = () => createSelector(sourcererScopesSelector, (scopes) => scopes);

export const kibanaDataViewsSelector = () =>
  createSelector(sourcererKibanaDataViewsSelector, (dataViews) => dataViews);

export const signalIndexNameSelector = () =>
  createSelector(sourcererSignalIndexNameSelector, (signalIndexName) => signalIndexName);

export const defaultDataViewSelector = () =>
  createSelector(sourcererDefaultDataViewSelector, (dataViews) => dataViews);

export const sourcererDataViewSelector = () =>
  createSelector(dataViewSelector, (dataView) => dataView);

export interface SourcererScopeSelector extends Omit<SourcererModel, 'sourcererScopes'> {
  selectedDataView: SourcererDataView | undefined;
  sourcererScope: SourcererScope;
}

export const getSourcererScopeSelector = () => {
  const getKibanaDataViewsSelector = kibanaDataViewsSelector();
  const getDefaultDataViewSelector = defaultDataViewSelector();
  const getSignalIndexNameSelector = signalIndexNameSelector();
  const getSourcererDataViewSelector = sourcererDataViewSelector();
  const getScopeSelector = scopeIdSelector();

  return (state: State, scopeId: SourcererScopeName): SourcererScopeSelector => {
    const kibanaDataViews = getKibanaDataViewsSelector(state);
    const defaultDataView = getDefaultDataViewSelector(state);
    const signalIndexName = getSignalIndexNameSelector(state);
    const scope = getScopeSelector(state, scopeId);
    const selectedDataView = getSourcererDataViewSelector(state, scope.selectedDataViewId);

    return {
      defaultDataView,
      kibanaDataViews,
      signalIndexName,
      selectedDataView,
      sourcererScope: scope,
    };
  };
};
