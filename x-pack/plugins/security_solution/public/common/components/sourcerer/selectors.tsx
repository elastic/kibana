/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { State } from '../../store';
import { sourcererSelectors } from '../../store/sourcerer';
import {
  KibanaIndexPattern,
  KibanaIndexPatterns,
  ManageScope,
  SourcererScopeName,
} from '../../store/sourcerer/model';

export interface SourcererScopeSelector {
  defaultIndexPattern: KibanaIndexPattern;
  kibanaIndexPatterns: KibanaIndexPatterns;
  sourcererScope: ManageScope;
}

export const getSourcererScopeSelector = () => {
  const getKibanaIndexPatternsSelector = sourcererSelectors.kibanaIndexPatternsSelector();
  const getDefaultIndexPatternSelector = sourcererSelectors.defaultIndexPatternSelector();
  const getScopesSelector = sourcererSelectors.scopesSelector();

  return (state: State, scopeId: SourcererScopeName): SourcererScopeSelector => {
    const kibanaIndexPatterns = getKibanaIndexPatternsSelector(state);
    const defaultIndexPattern = getDefaultIndexPatternSelector(state);
    const scope = getScopesSelector(state)[scopeId];

    return {
      defaultIndexPattern,
      kibanaIndexPatterns,
      sourcererScope: scope,
    };
  };
};
