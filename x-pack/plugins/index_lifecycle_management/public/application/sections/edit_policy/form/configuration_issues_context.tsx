/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { get } from 'lodash';
import React, { FunctionComponent, createContext, useContext } from 'react';
import { useFormData } from '../../../../shared_imports';

export interface ConfigurationIssues {
  /**
   * If this value is true, phases after hot cannot set shrink, forcemerge, freeze, or
   * searchable_snapshot actions.
   *
   * See https://github.com/elastic/elasticsearch/blob/master/docs/reference/ilm/actions/ilm-searchable-snapshot.asciidoc.
   */
  isUsingSearchableSnapshotInHotPhase: boolean;
}

const ConfigurationIssuesContext = createContext<ConfigurationIssues>(null as any);

const pathToHotPhaseSearchableSnapshot =
  'phases.hot.actions.searchable_snapshot.snapshot_repository';

export const ConfigurationIssuesProvider: FunctionComponent = ({ children }) => {
  const [formData] = useFormData({ watch: pathToHotPhaseSearchableSnapshot });
  return (
    <ConfigurationIssuesContext.Provider
      value={{
        isUsingSearchableSnapshotInHotPhase:
          get(formData, pathToHotPhaseSearchableSnapshot) != null,
      }}
    >
      {children}
    </ConfigurationIssuesContext.Provider>
  );
};

export const useConfigurationIssues = () => {
  const ctx = useContext(ConfigurationIssuesContext);
  if (!ctx)
    throw new Error('Cannot use configuration issues outside of configuration issues context');

  return ctx;
};
