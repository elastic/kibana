/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useContext, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { getIndexStatus, selectIndexState } from '../../../../state';
import { SyntheticsRefreshContext } from '../../../../contexts';
// import { getDynamicSettings } from '../../../state/actions/dynamic_settings';

export const useHasData = () => {
  const { loading, error, data } = useSelector(selectIndexState);
  const { lastRefresh } = useContext(SyntheticsRefreshContext);

  // const { settings } = useSelector(selectDynamicSettings); // TODO: Add state for dynamicSettings
  const settings = { heartbeatIndices: 'synthetics-*' };

  const dispatch = useDispatch();

  useEffect(() => {
    dispatch(getIndexStatus());
  }, [dispatch, lastRefresh]);

  /* useEffect(() => {
    dispatch(getDynamicSettings());
  }, [dispatch]);*/

  return {
    data,
    error,
    loading,
    settings,
  };
};
