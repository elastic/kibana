/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { createContext, useContext, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useFetcher } from '../../../observability/public';
import { DataPublicPluginStart, IndexPattern } from '../../../../../src/plugins/data/public';
import { indexStatusSelector, selectDynamicSettings } from '../state/selectors';
import { getDynamicSettings } from '../state/actions/dynamic_settings';

export const UptimeIndexPatternContext = createContext({} as IndexPattern);

export const UptimeIndexPatternContextProvider: React.FC<{ data: DataPublicPluginStart }> = ({
  children,
  data: { indexPatterns },
}) => {
  const { settings } = useSelector(selectDynamicSettings);
  const { data: indexStatus } = useSelector(indexStatusSelector);

  const dispatch = useDispatch();

  useEffect(() => {
    if (typeof settings === 'undefined') {
      dispatch(getDynamicSettings());
    }
  }, [dispatch, settings]);

  const heartbeatIndices = settings?.heartbeatIndices || '';

  const { data } = useFetcher<Promise<IndexPattern | undefined>>(async () => {
    if (heartbeatIndices && indexStatus?.indexExists) {
      // this only creates an index pattern in memory, not as saved object
      return indexPatterns.create({ title: heartbeatIndices });
    }
  }, [heartbeatIndices, indexStatus?.indexExists]);

  return <UptimeIndexPatternContext.Provider value={data!} children={children} />;
};

export const useIndexPattern = () => useContext(UptimeIndexPatternContext);
