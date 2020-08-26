/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createSelector } from 'reselect';
import { State } from '../types';
import { SourcererScopeById, SourcererScopeName } from './model';

export const activeSourcererScopeIdSelector = ({ sourcerer }: State): SourcererScopeName =>
  sourcerer.activeSourcererScopeId;
export const kibanaIndexPatternsSelector = ({ sourcerer }: State): string[] =>
  sourcerer.kibanaIndexPatterns;
export const isIndexPatternsLoadingSelector = ({ sourcerer }: State): boolean =>
  sourcerer.isIndexPatternsLoading;
export const sourcererScopesSelector = ({ sourcerer }: State): SourcererScopeById =>
  sourcerer.sourcererScopes;
export const scopesSelector = () => createSelector(sourcererScopesSelector, (scopes) => scopes);
