/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useState } from 'react';
import { isSecurityAppError } from '@kbn/securitysolution-t-grid';

import { useAppToasts } from '../../../../common/hooks/use_app_toasts';
import { checkSignalIndex } from './api';
import * as i18n from './translations';
import { useAlertsPrivileges } from './use_alerts_privileges';

interface ReturnSignalIndex {
  loading: boolean;
  signalIndexExists: boolean | null;
  signalIndexName: string | null;
  signalIndexMappingOutdated: boolean | null;
}

/**
 * Hook for managing signal index
 *
 *
 */
export const useCheckSignalIndex = (): ReturnSignalIndex => {
  const [loading, setLoading] = useState(true);
  const [signalIndex, setSignalIndex] = useState<Omit<ReturnSignalIndex, 'loading'>>({
    signalIndexExists: null,
    signalIndexName: null,
    signalIndexMappingOutdated: null,
  });
  const { addError } = useAppToasts();
  const { hasIndexRead } = useAlertsPrivileges();

  useEffect(() => {
    let isSubscribed = true;
    const abortCtrl = new AbortController();

    const fetchData = async () => {
      try {
        setLoading(true);
        const signal = await checkSignalIndex({ signal: abortCtrl.signal });

        if (isSubscribed && signal != null) {
          setSignalIndex({
            signalIndexExists: signal?.indexExists,
            signalIndexName: signal.name,
            signalIndexMappingOutdated: signal.index_mapping_outdated,
          });
        }
      } catch (error) {
        if (isSubscribed) {
          setSignalIndex({
            signalIndexExists: false,
            signalIndexName: null,
            signalIndexMappingOutdated: null,
          });
          if (isSecurityAppError(error) && error.body.status_code !== 404) {
            addError(error, { title: i18n.SIGNAL_GET_NAME_FAILURE });
          }
        }
      }
      if (isSubscribed) {
        setLoading(false);
      }
    };

    if (hasIndexRead) {
      fetchData();
    } else {
      // Skip data fetching as the current user doesn't have enough priviliges.
      // Attempt to get the signal index will result in 500 error.
      setLoading(false);
    }
    return () => {
      isSubscribed = false;
      abortCtrl.abort();
    };
  }, [addError, hasIndexRead]);

  return { loading, ...signalIndex };
};
