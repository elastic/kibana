/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { get } from 'lodash';
import React, { FunctionalComponent, createContext, useContext } from 'react';
import { useFormData } from '../../../../shared_imports';

export interface SearchableSnapshotValue {
  /**
   * If this value is true, phases after hot cannot set shrink, forcemerge, freeze, or
   * searchable_snapshot actions.
   *
   * See https://github.com/elastic/elasticsearch/blob/master/docs/reference/ilm/actions/ilm-searchable-snapshot.asciidoc.
   */
  isUsingSearchableSnapshotInHotPhase: boolean;
}

const SearchableSnapshotStateContext = createContext<SearchableSnapshotValue>(null as any);

const pathToHotPhaseSearchableSnapshot =
  'phases.hot.actions.searchable_snapshot.snapshot_repository';

export const SearchableSnapshotStateProvider: FunctionalComponent = () => {
  const [formData] = useFormData({ watch: pathToHotPhaseSearchableSnapshot });
  return (
    <SearchableSnapshotStateContext.Provider
      value={{
        isUsingSearchableSnapshotInHotPhase: !!get(formData, pathToHotPhaseSearchableSnapshot),
      }}
    >
      {children}
    </SearchableSnapshotStateContext.Provider>
  );
};

export const useSearchableSnapshotState = () => {
  const ctx = useContext(SearchableSnapshotStateContext);
  if (!ctx)
    throw new Error(
      'Cannot use searchable snapshot state outside of searchable snapshot state context'
    );

  return ctx;
};
