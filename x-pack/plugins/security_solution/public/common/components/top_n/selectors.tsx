/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { State } from '../../store';
import { sourcererSelectors } from '../../store/selectors';

export interface IndicesSelector {
  all: string[];
  raw: string[];
}

export const getIndicesSelector = () => {
  const getkibanaDataViewsSelector = sourcererSelectors.kibanaDataViewsSelector();
  const getSignalIndexNameSelector = sourcererSelectors.signalIndexNameSelector();

  const mapStateToProps = (state: State): IndicesSelector => {
    const rawIndices = new Set<string>();
    const kibanaDataViews = getkibanaDataViewsSelector(state);
    const alertIndexName = getSignalIndexNameSelector(state);
    kibanaDataViews.forEach(({ title }) => {
      if (title !== alertIndexName) {
        rawIndices.add(title);
      }
    });

    return {
      all: alertIndexName != null ? [...rawIndices, alertIndexName] : [...rawIndices],
      raw: [...rawIndices],
    };
  };

  return mapStateToProps;
};
