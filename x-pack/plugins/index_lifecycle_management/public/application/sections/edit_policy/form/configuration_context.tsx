/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { get } from 'lodash';
import React, { FunctionComponent, createContext, useContext } from 'react';

import { useFormData } from '../../../../shared_imports';

import { isUsingDefaultRolloverPath, isUsingCustomRolloverPath } from '../constants';

export interface Configuration {
  /**
   * Whether the serialized policy will use rollover. This blocks certain actions in
   * the form such as hot phase (forcemerge, shrink) and cold phase (searchable snapshot).
   */
  isUsingRollover: boolean;
  /**
   * If this value is true, phases after hot cannot set shrink, forcemerge or
   * searchable_snapshot actions.
   *
   * See https://github.com/elastic/elasticsearch/blob/master/docs/reference/ilm/actions/ilm-searchable-snapshot.asciidoc.
   */
  isUsingSearchableSnapshotInHotPhase: boolean;
  isUsingSearchableSnapshotInColdPhase: boolean;
}

const ConfigurationContext = createContext<Configuration>(null as any);

const pathToHotPhaseSearchableSnapshot =
  'phases.hot.actions.searchable_snapshot.snapshot_repository';

const pathToColdPhaseSearchableSnapshot =
  'phases.cold.actions.searchable_snapshot.snapshot_repository';

export const ConfigurationProvider: FunctionComponent = ({ children }) => {
  const [formData] = useFormData({
    watch: [
      pathToHotPhaseSearchableSnapshot,
      pathToColdPhaseSearchableSnapshot,
      isUsingCustomRolloverPath,
      isUsingDefaultRolloverPath,
    ],
  });
  const isUsingDefaultRollover = get(formData, isUsingDefaultRolloverPath);
  // Provide default value, as path may become undefined if removed from the DOM
  const isUsingCustomRollover = get(formData, isUsingCustomRolloverPath, true);

  const context: Configuration = {
    isUsingRollover: isUsingDefaultRollover === false ? isUsingCustomRollover : true,
    isUsingSearchableSnapshotInHotPhase: get(formData, pathToHotPhaseSearchableSnapshot) != null,
    isUsingSearchableSnapshotInColdPhase: get(formData, pathToColdPhaseSearchableSnapshot) != null,
  };

  return <ConfigurationContext.Provider value={context}>{children}</ConfigurationContext.Provider>;
};

export const useConfiguration = () => {
  const ctx = useContext(ConfigurationContext);
  if (!ctx) throw new Error('Cannot use configuration outside of configuration context');

  return ctx;
};
