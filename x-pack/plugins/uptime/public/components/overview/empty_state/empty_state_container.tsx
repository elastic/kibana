/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useContext, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { indexStatusAction } from '../../../state/actions';
import { indexStatusSelector, selectDynamicSettings } from '../../../state/selectors';
import { EmptyStateComponent } from './index';
import { UptimeRefreshContext } from '../../../contexts';
import { getDynamicSettings } from '../../../state/actions/dynamic_settings';

export const EmptyState: React.FC = ({ children }) => {
  const { data, loading, error } = useSelector(indexStatusSelector);
  const { lastRefresh } = useContext(UptimeRefreshContext);

  const { settings } = useSelector(selectDynamicSettings);

  const heartbeatIndices = settings?.heartbeatIndices || '';

  const dispatch = useDispatch();

  const noDataInfo = !data || data?.docCount === 0 || data?.indexExists === false;

  useEffect(() => {
    if (noDataInfo) {
      // only call when we haven't fetched it already
      dispatch(indexStatusAction.get());
    }
  }, [dispatch, lastRefresh, noDataInfo]);

  useEffect(() => {
    // using separate side effect, we want to call index status,
    // every statue indices setting changes
    dispatch(indexStatusAction.get());
  }, [dispatch, heartbeatIndices]);

  useEffect(() => {
    dispatch(getDynamicSettings());
  }, [dispatch]);

  return (
    <EmptyStateComponent
      statesIndexStatus={data}
      loading={loading}
      errors={error ? [error] : undefined}
      children={children as React.ReactElement}
      settings={settings}
    />
  );
};
