/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { State } from '../../../common/store';
import { sourcererSelectors } from '../../../common/store/sourcerer';
import {
  KibanaIndexPatterns,
  ManageScope,
  SourcererScopeName,
} from '../../../common/store/sourcerer/model';

export interface DefaultSourcererSelector {
  kibanaIndexPatterns: KibanaIndexPatterns;
  sourcererScope: ManageScope;
}

export const getDefaultSourcererSelector = () => {
  const getKibanaIndexPatternsSelector = sourcererSelectors.kibanaIndexPatternsSelector();
  const getScopesSelector = sourcererSelectors.scopesSelector();

  const mapStateToProps = (state: State): DefaultSourcererSelector => {
    const kibanaIndexPatterns = getKibanaIndexPatternsSelector(state);
    const scope = getScopesSelector(state)[SourcererScopeName.default];

    return {
      kibanaIndexPatterns,
      sourcererScope: scope,
    };
  };

  return mapStateToProps;
};
