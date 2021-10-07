/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import memoizeOne from 'memoize-one';
import { createSelector } from 'reselect';
import { State } from '../types';
import { SourcererDataView, ManageScope, SourcererScopeById, SourcererScopeName } from './model';

export const sourcererKibanaDataViewsSelector = ({ sourcerer }: State): SourcererDataView[] =>
  sourcerer.kibanaDataViews;

export const sourcererSignalIndexNameSelector = ({ sourcerer }: State): string | null =>
  sourcerer.signalIndexName;

export const sourcererDefaultDataViewSelector = ({ sourcerer }: State): SourcererDataView =>
  sourcerer.defaultDataView;

export const sourcererDataViewSelector = ({ sourcerer }: State, id: string): SourcererDataView =>
  sourcerer.kibanaDataViews.find((dataView) => dataView.id === id) ?? sourcerer.defaultDataView;

export const sourcererScopeIdSelector = (
  { sourcerer }: State,
  scopeId: SourcererScopeName
): ManageScope => sourcerer.sourcererScopes[scopeId];

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

export const sourcererDataView = () =>
  createSelector(sourcererDataViewSelector, (dataView) => dataView);

export interface SelectedDataView {
  browserFields: SourcererDataView['browserFields'];
  dataViewId: SourcererDataView['id'];
  docValueFields: SourcererDataView['docValueFields'];
  indexPattern: SourcererDataView['indexPattern'];
  indicesExist: ManageScope['indicesExist'];
  runtimeMappings: SourcererDataView['runtimeMappings'];
  loading: boolean;
  // these are manipulated
  patternList: string[];
  selectedPatterns: string[];
}

const EXCLUDE_ELASTIC_CLOUD_INDEX = '-*elastic-cloud-logs-*';
// tested via containers/source/index.test.tsx
export const getSelectedDataViewSelector = () => {
  const getScopeSelector = scopeIdSelector();
  const getDefaultDataViewSelector = defaultDataViewSelector();
  const getKibanaDataViewsSelector = kibanaDataViewsSelector();

  return (
    state: State,
    scopeId: SourcererScopeName = SourcererScopeName.default
  ): SelectedDataView => {
    const {
      selectedDataViewId,
      selectedPatterns: scopeSelectedPatterns,
      indicesExist,
      loading,
    } = getScopeSelector(state, scopeId);
    const defaultDataView = getDefaultDataViewSelector(state);
    const kibanaDataViews = getKibanaDataViewsSelector(state);
    const dataViewId = selectedDataViewId === null ? defaultDataView.id : selectedDataViewId;
    const theDataView = kibanaDataViews.find((dataView) => dataView.id === dataViewId);

    const patternList = theDataView != null ? theDataView.title.split(',') : [];

    const getSelectedPatterns = memoizeOne((patterns: string[]): string[] => {
      return (
        patterns.some((index) => index === 'logs-*')
          ? [...patterns, EXCLUDE_ELASTIC_CLOUD_INDEX]
          : patterns
      ).sort();
    });
    const getDataView = memoizeOne(
      (indexPattern, title) => ({
        ...indexPattern,
        title,
      }),
      (newArgs, lastArgs) => newArgs[0] === lastArgs[0] && newArgs[1].length === lastArgs[1].length
    );
    const { browserFields, docValueFields, runtimeMappings, indexPattern } =
      theDataView != null ? theDataView : defaultDataView;
    const selectedPatterns = getSelectedPatterns(scopeSelectedPatterns);
    return {
      browserFields,
      dataViewId,
      docValueFields,
      indexPattern: getDataView(indexPattern, selectedPatterns.join()),
      indicesExist,
      loading,
      runtimeMappings,
      // all patterns in DATA_VIEW
      patternList,
      // selected patterns in DATA_VIEW
      selectedPatterns,
    };
  };
};
