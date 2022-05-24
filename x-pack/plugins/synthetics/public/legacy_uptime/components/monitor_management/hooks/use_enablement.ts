/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { monitorManagementListSelector } from '../../../state/selectors';
import {
  getSyntheticsEnablement,
  disableSynthetics,
  enableSynthetics,
} from '../../../state/actions';

export function useEnablement() {
  const dispatch = useDispatch();

  const {
    loading: { enablement: loading },
    error: { enablement: error },
    enablement,
    list: { total },
  } = useSelector(monitorManagementListSelector);

  useEffect(() => {
    if (!enablement) {
      dispatch(getSyntheticsEnablement());
    }
  }, [dispatch, enablement]);

  return {
    enablement: {
      areApiKeysEnabled: enablement?.areApiKeysEnabled,
      canEnable: enablement?.canEnable,
      isEnabled: enablement?.isEnabled,
    },
    error,
    loading,
    totalMonitors: total,
    enableSynthetics: useCallback(() => dispatch(enableSynthetics()), [dispatch]),
    disableSynthetics: useCallback(() => dispatch(disableSynthetics()), [dispatch]),
  };
}
