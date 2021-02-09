/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import memoizeOne from 'memoize-one';
import { createSelector } from 'reselect';
import { State } from '../types';
import {
  KibanaIndexPatterns,
  ManageScope,
  SelectablePatterns,
  SourcererPatternType,
  SourcererScopeById,
  SourcererScopeName,
} from './model';

export const sourcererKibanaIndexPatternsSelector = ({ sourcerer }: State): KibanaIndexPatterns =>
  sourcerer.kibanaIndexPatterns;

export const sourcererSignalIndexNameSelector = ({ sourcerer }: State): string | null =>
  sourcerer.signalIndexName;

export const sourcererConfigIndexPatternsSelector = ({ sourcerer }: State): string[] =>
  sourcerer.configIndexPatterns;

export const sourcererScopeIdSelector = (
  { sourcerer }: State,
  scopeId: SourcererScopeName
): ManageScope => sourcerer.sourcererScopes[scopeId];

export const scopeIdSelector = () => createSelector(sourcererScopeIdSelector, (scope) => scope);

export const sourcererScopesSelector = ({ sourcerer }: State): SourcererScopeById =>
  sourcerer.sourcererScopes;

export const scopesSelector = () => createSelector(sourcererScopesSelector, (scopes) => scopes);

export const kibanaIndexPatternsSelector = () =>
  createSelector(
    sourcererKibanaIndexPatternsSelector,
    (kibanaIndexPatterns) => kibanaIndexPatterns
  );

export const signalIndexNameSelector = () =>
  createSelector(sourcererSignalIndexNameSelector, (signalIndexName) => signalIndexName);

export const configIndexPatternsSelector = () =>
  createSelector(
    sourcererConfigIndexPatternsSelector,
    (configIndexPatterns) => configIndexPatterns
  );
export const getIndexPatternsSelectedSelector = () => {
  const getScopeSelector = scopeIdSelector();
  const getConfigIndexPatternsSelector = configIndexPatternsSelector();

  return (state: State, scopeId: SourcererScopeName): { selectedPatterns: SelectablePatterns } => {
    const scope = getScopeSelector(state, scopeId);
    const configIndexPatterns = getConfigIndexPatternsSelector(state);
    return {
      selectedPatterns:
        scope.selectedPatterns.length === 0
          ? configIndexPatterns.map((title) => ({ title, id: SourcererPatternType.config }))
          : scope.selectedPatterns,
      // previousIndexNames: scope.indexPattern.title,
    };
  };
};
export const getIndexNamesSelectedSelector = () => {
  const getScopeSelector = scopeIdSelector();
  const getConfigIndexPatternsSelector = configIndexPatternsSelector();

  return (
    state: State,
    scopeId: SourcererScopeName
  ): { indexNames: string[]; previousIndexNames: string } => {
    const scope = getScopeSelector(state, scopeId);
    const configIndexPatterns = getConfigIndexPatternsSelector(state);
    return {
      indexNames: scope.indexNames.length === 0 ? configIndexPatterns : scope.indexNames,
      previousIndexNames: scope.indexPattern.title,
    };
  };
};

export const getAllSelectablePatternsSelector = () => {
  const getSignalIndexNameSelector = signalIndexNameSelector();
  const getConfigIndexPatternsSelector = configIndexPatternsSelector();

  return (state: State): SelectablePatterns => {
    const signalIndexName = getSignalIndexNameSelector(state);
    const configIndexPatterns = getConfigIndexPatternsSelector(state);
    const configAsSelectable = configIndexPatterns.map((title) => ({
      title,
      id: SourcererPatternType.config,
    }));
    return signalIndexName != null
      ? [...configAsSelectable, { title: signalIndexName, id: SourcererPatternType.detections }]
      : configAsSelectable;
  };
};

const EXCLUDE_ELASTIC_CLOUD_INDEX = '-*elastic-cloud-logs-*';

export const getSourcererScopeSelector = () => {
  const getScopeIdSelector = scopeIdSelector();
  // need to talk about this, it shouldn't be dont here i dont think
  // const getSelectedPatterns = memoizeOne((selectedPatternsStr: string): string[] => {
  //   if (selectedPatternsStr.length > 0) {
  //     debugger;
  //   }
  //   const selectedPatterns = selectedPatternsStr.length > 0 ? selectedPatternsStr.split(',') : [];
  //   return selectedPatterns.some((index) => index === 'logs-*')
  //     ? [...selectedPatterns, EXCLUDE_ELASTIC_CLOUD_INDEX]
  //     : selectedPatterns;
  // });

  const getIndexPattern = memoizeOne(
    (indexPattern, title) => ({
      ...indexPattern,
      title,
    }),
    (newArgs, lastArgs) => newArgs[0] === lastArgs[0] && newArgs[1].length === lastArgs[1].length
  );

  return (state: State, scopeId: SourcererScopeName): ManageScope => {
    const scope = getScopeIdSelector(state, scopeId);
    // const selectedPatterns = getSelectedPatterns(scope.selectedPatterns.sort().join());

    const indexPattern = getIndexPattern(scope.indexPattern, scope.indexNames.join());

    return {
      ...scope,
      indexPattern,
    };
  };
};
