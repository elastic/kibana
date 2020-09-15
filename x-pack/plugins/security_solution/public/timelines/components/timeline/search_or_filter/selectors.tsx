/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { State } from '../../../../common/store';
import { sourcererSelectors } from '../../../../common/store/selectors';
import {
  KibanaIndexPatterns,
  ManageScope,
  SourcererScopeName,
} from '../../../../common/store/sourcerer/model';

export interface SourcererScopeSelector {
  allExistingIndexPatterns: string[];
  kibanaIndexPatterns: KibanaIndexPatterns;
  signalIndexName: string | null;
  sourcererScope: ManageScope;
}

export const getSourcererScopeSelector = () => {
  const getkibanaIndexPatternsSelector = sourcererSelectors.kibanaIndexPatternsSelector();
  const getScopesSelector = sourcererSelectors.scopesSelector();
  const getAllIndexPatternsSelector = sourcererSelectors.allIndexPatternsSelector();
  const getSignalIndexNameSelector = sourcererSelectors.signalIndexNameSelector();

  const mapStateToProps = (state: State, scopeId: SourcererScopeName): SourcererScopeSelector => {
    const kibanaIndexPatterns = getkibanaIndexPatternsSelector(state);
    const scope = getScopesSelector(state)[scopeId];
    const allExistingIndexPatterns = getAllIndexPatternsSelector(state);
    const signalIndexName = getSignalIndexNameSelector(state);

    return {
      kibanaIndexPatterns,
      allExistingIndexPatterns,
      signalIndexName,
      sourcererScope: scope,
    };
  };

  return mapStateToProps;
};
