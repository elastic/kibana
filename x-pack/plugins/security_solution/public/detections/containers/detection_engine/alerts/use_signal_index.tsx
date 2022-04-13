/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useState } from 'react';
import { isSecurityAppError } from '@kbn/securitysolution-t-grid';

import { useAppToasts } from '../../../../common/hooks/use_app_toasts';
import { useIsExperimentalFeatureEnabled } from '../../../../common/hooks/use_experimental_features';
import { createSignalIndex, getSignalIndex } from './api';
import * as i18n from './translations';
import { useAlertsPrivileges } from './use_alerts_privileges';

type Func = () => Promise<void>;

export interface ReturnSignalIndex {
  loading: boolean;
  signalIndexExists: boolean | null;
  signalIndexName: string | null;
  signalIndexMappingOutdated: boolean | null;
  createDeSignalIndex: Func | null;
}

/**
 * Hook for managing signal index
 *
 *
 */
export const useSignalIndex = (): ReturnSignalIndex => {
  const [loading, setLoading] = useState(true);
  const [signalIndex, setSignalIndex] = useState<Omit<ReturnSignalIndex, 'loading'>>({
    signalIndexExists: null,
    signalIndexName: null,
    signalIndexMappingOutdated: null,
    createDeSignalIndex: null,
  });
  const { addError } = useAppToasts();
  const { hasIndexRead } = useAlertsPrivileges();
  // TODO: Once we are past experimental phase this code should be removed
  const ruleRegistryEnabled = useIsExperimentalFeatureEnabled('ruleRegistryEnabled');

  useEffect(() => {
    let isSubscribed = true;
    const abortCtrl = new AbortController();

    const fetchData = async () => {
      try {
        setLoading(true);
        const signal = await getSignalIndex({ signal: abortCtrl.signal });

        if (isSubscribed && signal != null) {
          setSignalIndex({
            signalIndexExists: true,
            signalIndexName: signal.name,
            signalIndexMappingOutdated: signal.index_mapping_outdated,
            createDeSignalIndex: createIndex,
          });
        }
      } catch (error) {
        if (isSubscribed) {
          setSignalIndex({
            signalIndexExists: false,
            signalIndexName: null,
            signalIndexMappingOutdated: null,
            createDeSignalIndex: createIndex,
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

    const createIndex = async () => {
      let isFetchingData = false;
      try {
        setLoading(true);
        await createSignalIndex({ signal: abortCtrl.signal });

        if (isSubscribed) {
          isFetchingData = true;
          fetchData();
        }
      } catch (error) {
        if (isSubscribed) {
          if (isSecurityAppError(error) && error.body.status_code === 409) {
            fetchData();
          } else {
            setSignalIndex({
              signalIndexExists: false,
              signalIndexName: null,
              signalIndexMappingOutdated: null,
              createDeSignalIndex: createIndex,
            });
            addError(error, { title: i18n.SIGNAL_POST_FAILURE });
          }
        }
      }
      if (isSubscribed && !isFetchingData) {
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
  }, [addError, hasIndexRead, ruleRegistryEnabled]);

  return { loading, ...signalIndex };
};
