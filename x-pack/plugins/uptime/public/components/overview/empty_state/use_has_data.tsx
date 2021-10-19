/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useContext, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { indexStatusAction } from '../../../state/actions';
import { indexStatusSelector, selectDynamicSettings } from '../../../state/selectors';
import { UptimeRefreshContext } from '../../../contexts';
import { getDynamicSettings } from '../../../state/actions/dynamic_settings';

export const useHasData = () => {
  const { loading, error, data } = useSelector(indexStatusSelector);
  const { lastRefresh } = useContext(UptimeRefreshContext);

  const { settings } = useSelector(selectDynamicSettings);

  const dispatch = useDispatch();

  useEffect(() => {
    dispatch(indexStatusAction.get());
  }, [dispatch, lastRefresh]);

  useEffect(() => {
    dispatch(getDynamicSettings());
  }, [dispatch]);

  return {
    data,
    error,
    loading,
    settings,
  };
};
