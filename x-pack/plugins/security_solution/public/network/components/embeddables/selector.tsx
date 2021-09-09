/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { State } from '../../../common/store';
import { sourcererSelectors } from '../../../common/store/sourcerer';
import {
  KibanaDataView,
  ManageScope,
  SourcererScopeName,
} from '../../../common/store/sourcerer/model';

export interface DefaultSourcererSelector {
  kibanaDataViews: KibanaDataView[];
  sourcererScope: ManageScope;
}

export const getDefaultSourcererSelector = () => {
  const getKibanaDataViewsSelector = sourcererSelectors.kibanaDataViewsSelector();
  const getScopesSelector = sourcererSelectors.scopesSelector();

  const mapStateToProps = (state: State): DefaultSourcererSelector => {
    const kibanaDataViews = getKibanaDataViewsSelector(state);
    const scope = getScopesSelector(state)[SourcererScopeName.default];

    return {
      kibanaDataViews,
      sourcererScope: scope,
    };
  };

  return mapStateToProps;
};
