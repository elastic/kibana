/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useRef } from 'react';
import { useAsync, withOptionalSignal } from '@kbn/securitysolution-hook-utils';
import { useAppToasts } from '../../../common/hooks/use_app_toasts';
import { getUserPrivilege } from '../../containers/detection_engine/alerts/api';
import * as i18n from './translations';

export const useFetchPrivileges = () => useAsync(withOptionalSignal(getUserPrivilege));

export const useFetchDetectionEnginePrivileges = (isAppAvailable: boolean = true) => {
  const { start, ...detectionEnginePrivileges } = useFetchPrivileges();
  const { addError } = useAppToasts();
  const abortCtrlRef = useRef(new AbortController());

  useEffect(() => {
    const { loading, result, error } = detectionEnginePrivileges;

    if (isAppAvailable && !loading && !(result || error)) {
      abortCtrlRef.current.abort();
      abortCtrlRef.current = new AbortController();
      start({ signal: abortCtrlRef.current.signal });
    }
  }, [start, detectionEnginePrivileges, isAppAvailable]);

  useEffect(() => {
    return () => {
      abortCtrlRef.current.abort();
    };
  }, []);

  useEffect(() => {
    const error = detectionEnginePrivileges.error;
    if (error != null) {
      addError(error, {
        title: i18n.DETECTION_ENGINE_PRIVILEGES_FETCH_FAILURE,
      });
    }
  }, [addError, detectionEnginePrivileges.error]);

  return detectionEnginePrivileges;
};
