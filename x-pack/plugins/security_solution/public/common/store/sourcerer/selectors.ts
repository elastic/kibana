/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createSelector } from 'reselect';
import { State } from '../types';
import { SourcererScopeById, KibanaIndexPatterns, SourcererScopeName, ManageScope } from './model';

export const sourcererKibanaIndexPatternsSelector = ({ sourcerer }: State): KibanaIndexPatterns =>
  sourcerer.kibanaIndexPatterns;

export const sourcererSignalIndexNameSelector = ({ sourcerer }: State): string | null =>
  sourcerer.signalIndexName;

export const sourcererConfigIndexPatternsSelector = ({ sourcerer }: State): string[] =>
  sourcerer.configIndexPatterns;

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
  const getScopesSelector = scopesSelector();
  const getConfigIndexPatternsSelector = configIndexPatternsSelector();

  const mapStateToProps = (state: State, scopeId: SourcererScopeName): string[] => {
    const scope = getScopesSelector(state)[scopeId];
    const configIndexPatterns = getConfigIndexPatternsSelector(state);

    return scope.selectedPatterns.length === 0 ? configIndexPatterns : scope.selectedPatterns;
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

export const defaultIndexNamesSelector = () => {
  const getScopesSelector = scopesSelector();
  const getConfigIndexPatternsSelector = configIndexPatternsSelector();

  const mapStateToProps = (state: State, scopeId: SourcererScopeName): string[] => {
    const scope = getScopesSelector(state)[scopeId];
    const configIndexPatterns = getConfigIndexPatternsSelector(state);

    return scope.selectedPatterns.length === 0 ? configIndexPatterns : scope.selectedPatterns;
  };

  return mapStateToProps;
};

export const getSourcererScopeSelector = () => {
  const getScopesSelector = scopesSelector();

  const mapStateToProps = (state: State, scopeId: SourcererScopeName): ManageScope =>
    getScopesSelector(state)[scopeId];

  return mapStateToProps;
};
