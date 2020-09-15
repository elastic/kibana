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

export const sourcererallIndexPatternsSelector = ({ sourcerer }: State): string[] =>
  sourcerer.allIndexPatterns;

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

export const allIndexPatternsSelector = () =>
  createSelector(
    sourcererallIndexPatternsSelector,
    (allExistingIndexPatterns) => allExistingIndexPatterns
  );

export const getIndexesNameSelectedSelector = () => {
  const getScopesSelector = scopesSelector();
  const getAllIndexPatternsSelector = allIndexPatternsSelector();

  const mapStateToProps = (state: State, scopeId: SourcererScopeName): string[] => {
    const scope = getScopesSelector(state)[scopeId];
    const allExistingIndexPatterns = getAllIndexPatternsSelector(state);

    return scope.selectedPatterns.length === 0 ? allExistingIndexPatterns : scope.selectedPatterns;
  };

  return mapStateToProps;
};

export const getSourcererScopeSelector = () => {
  const getScopesSelector = scopesSelector();

  const mapStateToProps = (state: State, scopeId: SourcererScopeName): ManageScope =>
    getScopesSelector(state)[scopeId];

  return mapStateToProps;
};
