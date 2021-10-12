/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { State } from '../../../../common/store';
import { sourcererSelectors } from '../../../../common/store/selectors';
import {
  SourcererDataView,
  SourcererScope,
  SourcererScopeName,
} from '../../../../common/store/sourcerer/model';

export interface SourcererScopeSelector {
  defaultDataView: SourcererDataView;
  kibanaDataViews: SourcererDataView[];
  signalIndexName: string | null;
  sourcererScope: SourcererScope;
}

export const getSourcererScopeSelector = () => {
  const getKibanaDataViewsSelector = sourcererSelectors.kibanaDataViewsSelector();
  const getDefaultDataViewSelector = sourcererSelectors.defaultDataViewSelector();
  const getScopeIdSelector = sourcererSelectors.scopeIdSelector();
  const getSignalIndexNameSelector = sourcererSelectors.signalIndexNameSelector();

  return (state: State, scopeId: SourcererScopeName): SourcererScopeSelector => {
    const kibanaDataViews = getKibanaDataViewsSelector(state);
    const defaultDataView = getDefaultDataViewSelector(state);
    const scope = getScopeIdSelector(state, scopeId);
    const signalIndexName = getSignalIndexNameSelector(state);

    return {
      defaultDataView,
      kibanaDataViews,
      signalIndexName,
      sourcererScope: scope,
    };
  };
};
