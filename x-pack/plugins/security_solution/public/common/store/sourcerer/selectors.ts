/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import memoizeOne from 'memoize-one';
import { createSelector } from 'reselect';
import { State } from '../types';
import { SourcererScopeById, ManageScope, KibanaIndexPatterns, SourcererScopeName } from './model';

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

export const getIndexNamesSelectedSelector = () => {
  const getScopeSelector = scopeIdSelector();
  const getConfigIndexPatternsSelector = configIndexPatternsSelector();

  const mapStateToProps = (
    state: State,
    scopeId: SourcererScopeName
  ): { indexNames: string[]; previousIndexNames: string } => {
    const scope = getScopeSelector(state, scopeId);
    const configIndexPatterns = getConfigIndexPatternsSelector(state);
    return {
      indexNames:
        scope.selectedPatterns.length === 0 ? configIndexPatterns : scope.selectedPatterns,
      previousIndexNames: scope.indexPattern.title,
    };
  };
  return mapStateToProps;
};

export const getAllExistingIndexNamesSelector = () => {
  const getSignalIndexNameSelector = signalIndexNameSelector();
  const getConfigIndexPatternsSelector = configIndexPatternsSelector();

  const mapStateToProps = (state: State): string[] => {
    const signalIndexName = getSignalIndexNameSelector(state);
    const configIndexPatterns = getConfigIndexPatternsSelector(state);

    return signalIndexName != null
      ? [...configIndexPatterns, signalIndexName]
      : configIndexPatterns;
  };

  return mapStateToProps;
};

const EXCLUDE_ELASTIC_CLOUD_INDEX = '-*elastic-cloud-logs-*';

export const getSourcererScopeSelector = () => {
  const getScopeIdSelector = scopeIdSelector();
  const getSelectedPatterns = memoizeOne((selectedPatternsStr: string): string[] => {
    const selectedPatterns = selectedPatternsStr.length > 0 ? selectedPatternsStr.split(',') : [];
    return selectedPatterns.some((index) => index === 'logs-*')
      ? [...selectedPatterns, EXCLUDE_ELASTIC_CLOUD_INDEX]
      : selectedPatterns;
  });

  const getIndexPattern = memoizeOne(
    (indexPattern, title) => ({
      ...indexPattern,
      title,
    }),
    (newArgs, lastArgs) => newArgs[0] === lastArgs[0] && newArgs[1].length === lastArgs[1].length
  );

  const mapStateToProps = (state: State, scopeId: SourcererScopeName): ManageScope => {
    const scope = getScopeIdSelector(state, scopeId);
    const selectedPatterns = getSelectedPatterns(scope.selectedPatterns.sort().join());
    const indexPattern = getIndexPattern(scope.indexPattern, selectedPatterns.join());

    return {
      ...scope,
      selectedPatterns,
      indexPattern,
    };
  };
  return mapStateToProps;
};
