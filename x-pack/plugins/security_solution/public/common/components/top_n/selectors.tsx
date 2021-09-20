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
  const getkibanaIndexPatternsSelector = sourcererSelectors.kibanaIndexPatternsSelector();
  const getConfigIndexPatternsSelector = sourcererSelectors.configIndexPatternsSelector();
  const getSignalIndexNameSelector = sourcererSelectors.signalIndexNameSelector();

  const mapStateToProps = (state: State): IndicesSelector => {
    const rawIndices = new Set(getConfigIndexPatternsSelector(state));
    const kibanaIndexPatterns = getkibanaIndexPatternsSelector(state);
    const alertIndexName = getSignalIndexNameSelector(state);
    kibanaIndexPatterns.forEach(({ title }) => {
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
