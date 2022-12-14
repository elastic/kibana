/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  getSyntheticsEnablement,
  enableSynthetics,
  disableSynthetics,
  selectSyntheticsEnablement,
} from '../state';

export function useEnablement() {
  const dispatch = useDispatch();

  const { loading, error, enablement } = useSelector(selectSyntheticsEnablement);

  useEffect(() => {
    if (!enablement) {
      dispatch(getSyntheticsEnablement());
    }
  }, [dispatch, enablement]);

  return {
    enablement: {
      areApiKeysEnabled: enablement?.areApiKeysEnabled,
      canManageApiKeys: enablement?.canManageApiKeys,
      canEnable: enablement?.canEnable,
      isEnabled: enablement?.isEnabled,
    },
    invalidApiKeyError: enablement ? !Boolean(enablement?.isValidApiKey) : false,
    error,
    loading,
    enableSynthetics: useCallback(() => dispatch(enableSynthetics()), [dispatch]),
    disableSynthetics: useCallback(() => dispatch(disableSynthetics()), [dispatch]),
  };
}
