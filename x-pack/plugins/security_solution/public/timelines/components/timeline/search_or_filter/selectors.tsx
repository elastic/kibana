/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
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
  const getScopeIdSelector = sourcererSelectors.scopeIdSelector();
  const getConfigIndexPatternsSelector = sourcererSelectors.configIndexPatternsSelector();
  const getSignalIndexNameSelector = sourcererSelectors.signalIndexNameSelector();

  const mapStateToProps = (state: State, scopeId: SourcererScopeName): SourcererScopeSelector => {
    const kibanaIndexPatterns = getkibanaIndexPatternsSelector(state);
    const scope = getScopeIdSelector(state, scopeId);
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
