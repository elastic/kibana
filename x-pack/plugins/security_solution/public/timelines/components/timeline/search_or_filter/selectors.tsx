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
  configIndexPatterns: string[];
  kibanaIndexPatterns: KibanaIndexPatterns;
  signalIndexName: string | null;
  sourcererScope: ManageScope;
}

export const getSourcererScopeSelector = () => {
  const getkibanaIndexPatternsSelector = sourcererSelectors.kibanaIndexPatternsSelector();
  const getScopesSelector = sourcererSelectors.scopesSelector();
  const getConfigIndexPatternsSelector = sourcererSelectors.configIndexPatternsSelector();
  const getSignalIndexNameSelector = sourcererSelectors.signalIndexNameSelector();

  const mapStateToProps = (state: State, scopeId: SourcererScopeName): SourcererScopeSelector => {
    const kibanaIndexPatterns = getkibanaIndexPatternsSelector(state);
    const scope = getScopesSelector(state)[scopeId];
    const configIndexPatterns = getConfigIndexPatternsSelector(state);
    const signalIndexName = getSignalIndexNameSelector(state);

    return {
      kibanaIndexPatterns,
      configIndexPatterns,
      signalIndexName,
      sourcererScope: scope,
    };
  };

  return mapStateToProps;
};
