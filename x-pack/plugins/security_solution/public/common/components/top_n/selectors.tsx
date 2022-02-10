/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { State } from '../../store';
import { sourcererSelectors } from '../../store/selectors';
import { SourcererScopeName } from '../../store/sourcerer/model';

export interface IndicesSelector {
  all: string[];
  raw: string[];
}

export const getIndicesSelector = () => {
  const getSignalIndexNameSelector = sourcererSelectors.signalIndexNameSelector();
  const getScopeSelector = sourcererSelectors.scopeIdSelector();

  return (state: State, scopeId: SourcererScopeName): IndicesSelector => {
    const signalIndexName = getSignalIndexNameSelector(state);
    const { selectedPatterns } = getScopeSelector(state, scopeId);
    const raw: string[] = selectedPatterns.filter((index) => index !== signalIndexName);

    return {
      all: signalIndexName != null ? [...raw, signalIndexName] : [...raw],
      raw,
    };
  };
};
