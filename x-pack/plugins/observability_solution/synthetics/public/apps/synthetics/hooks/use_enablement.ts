/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useKibana } from '@kbn/kibana-react-plugin/public';
import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { getSyntheticsEnablement, selectSyntheticsEnablement } from '../state';

export function useEnablement() {
  const dispatch = useDispatch();

  const { application } = useKibana().services;

  const { loading, error, enablement } = useSelector(selectSyntheticsEnablement);

  useEffect(() => {
    if (!enablement && !loading && !error) {
      dispatch(getSyntheticsEnablement());
    }
  }, [dispatch, enablement, error, loading]);

  useEffect(() => {
    if (!enablement?.canEnable && !enablement?.isEnabled && !loading && enablement) {
      application?.navigateToApp('synthetics', {
        path: '/monitors',
      });
    }
  }, [application, enablement, loading]);

  return {
    areApiKeysEnabled: enablement?.areApiKeysEnabled,
    canManageApiKeys: enablement?.canManageApiKeys,
    canEnable: enablement?.canEnable,
    isEnabled: enablement?.isEnabled,
    isServiceAllowed: Boolean(enablement?.isServiceAllowed),
    invalidApiKeyError: enablement ? !Boolean(enablement?.isValidApiKey) : false,
    error,
    loading,
  };
}
