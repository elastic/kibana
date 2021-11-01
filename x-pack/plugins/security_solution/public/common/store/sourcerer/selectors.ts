/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import memoizeOne from 'memoize-one';
import { createSelector } from 'reselect';
import { State } from '../types';
import { KibanaDataView, ManageScope, SourcererScopeById, SourcererScopeName } from './model';
import { getScopePatternListSelection } from './helpers';

export const sourcererKibanaDataViewsSelector = ({ sourcerer }: State): KibanaDataView[] =>
  sourcerer.kibanaDataViews;

export const sourcererSignalIndexNameSelector = ({ sourcerer }: State): string | null =>
  sourcerer.signalIndexName;

export const sourcererDefaultDataViewSelector = ({ sourcerer }: State): KibanaDataView =>
  sourcerer.defaultDataView;

export const sourcererScopeIdSelector = (
  { sourcerer }: State,
  scopeId: SourcererScopeName
): ManageScope => sourcerer.sourcererScopes[scopeId];

export const scopeIdSelector = () => createSelector(sourcererScopeIdSelector, (scope) => scope);

export const sourcererScopesSelector = ({ sourcerer }: State): SourcererScopeById =>
  sourcerer.sourcererScopes;

export const scopesSelector = () => createSelector(sourcererScopesSelector, (scopes) => scopes);

export const kibanaDataViewsSelector = () =>
  createSelector(sourcererKibanaDataViewsSelector, (patterns) => patterns);

export const signalIndexNameSelector = () =>
  createSelector(sourcererSignalIndexNameSelector, (signalIndexName) => signalIndexName);

export const defaultDataViewSelector = () =>
  createSelector(sourcererDefaultDataViewSelector, (patterns) => patterns);

export interface SelectedDataView {
  dataViewId: string;
  patternList: string[];
  selectedPatterns: string[];
}

// tested via containers/source/index.test.tsx
export const getSelectedDataViewSelector = () => {
  const getScopeSelector = scopeIdSelector();
  const getDefaultDataViewSelector = defaultDataViewSelector();
  const getSignalIndexNameSelector = signalIndexNameSelector();
  const getKibanaDataViewsSelector = kibanaDataViewsSelector();

  return (state: State, scopeId: SourcererScopeName): SelectedDataView => {
    const scope = getScopeSelector(state, scopeId);
    const defaultDataView = getDefaultDataViewSelector(state);
    const kibanaDataViews = getKibanaDataViewsSelector(state);
    const signalIndexName = getSignalIndexNameSelector(state);
    const dataViewId =
      scope.selectedDataViewId === null ? defaultDataView.id : scope.selectedDataViewId;
    const theDataView = kibanaDataViews.find((dataView) => dataView.id === dataViewId);

    const patternList = theDataView != null ? theDataView.title.split(',') : [];

    let selectedPatterns: string[] = scope.selectedPatterns;
    if (selectedPatterns.length === 0) {
      if (scopeId === SourcererScopeName.detections && signalIndexName != null) {
        selectedPatterns = [signalIndexName];
      } else if (scopeId !== SourcererScopeName.detections && theDataView != null) {
        selectedPatterns = getScopePatternListSelection(
          theDataView,
          scopeId,
          signalIndexName,
          theDataView.id === defaultDataView.id
        );
      }
    }

    return {
      dataViewId,
      // all patterns in DATA_VIEW
      patternList,
      // selected patterns in DATA_VIEW
      selectedPatterns,
    };
  };
};

const EXCLUDE_ELASTIC_CLOUD_INDEX = '-*elastic-cloud-logs-*';

export const getSourcererScopeSelector = () => {
  const getScopeIdSelector = scopeIdSelector();
  const getSelectedPatterns = memoizeOne((selectedPatternsStr: string[]): string[] => {
    const selectedPatterns = selectedPatternsStr.length > 0 ? selectedPatternsStr.sort() : [];
    return selectedPatterns.some((index) => index === 'logs-*')
      ? [...selectedPatterns, EXCLUDE_ELASTIC_CLOUD_INDEX]
      : selectedPatterns;
  });

  const getDataView = memoizeOne(
    (indexPattern, title) => ({
      ...indexPattern,
      title,
    }),
    (newArgs, lastArgs) => newArgs[0] === lastArgs[0] && newArgs[1].length === lastArgs[1].length
  );

  return (state: State, scopeId: SourcererScopeName): ManageScope => {
    const scope = getScopeIdSelector(state, scopeId);
    const selectedPatterns = getSelectedPatterns(scope.selectedPatterns);
    const indexPattern = getDataView(scope.indexPattern, selectedPatterns.join());

    return {
      ...scope,
      selectedPatterns,
      indexPattern,
    };
  };
};
