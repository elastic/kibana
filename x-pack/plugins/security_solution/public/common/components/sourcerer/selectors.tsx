/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { State } from '../../store';
import { sourcererSelectors } from '../../store/sourcerer';
import { KibanaIndexPatterns, ManageScope, SourcererScopeName } from '../../store/sourcerer/model';

export interface SourcererScopeSelector {
  allExistingIndexPatterns: string[];
  kibanaIndexPatterns: KibanaIndexPatterns;
  sourcererScope: ManageScope;
}

export const getSourcererScopeSelector = () => {
  const getkibanaIndexPatternsSelector = sourcererSelectors.kibanaIndexPatternsSelector();
  const getScopesSelector = sourcererSelectors.scopesSelector();
  const getAllIndexPatternsSelector = sourcererSelectors.allIndexPatternsSelector();

  const mapStateToProps = (state: State, scopeId: SourcererScopeName): SourcererScopeSelector => {
    const kibanaIndexPatterns = getkibanaIndexPatternsSelector(state);
    const scope = getScopesSelector(state)[scopeId];
    const allExistingIndexPatterns = getAllIndexPatternsSelector(state);

    return {
      kibanaIndexPatterns,
      allExistingIndexPatterns,
      sourcererScope: scope,
    };
  };

  return mapStateToProps;
};
