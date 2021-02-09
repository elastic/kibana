/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useState } from 'react';

import { errorToToaster, useStateToaster } from '../../../../common/components/toasters';
import { createSignalIndex, getSignalIndex } from './api';
import * as i18n from './translations';
import { isSecurityAppError } from '../../../../common/utils/api';

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
  const [, dispatchToaster] = useStateToaster();

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
            errorToToaster({ title: i18n.SIGNAL_GET_NAME_FAILURE, error, dispatchToaster });
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
            errorToToaster({ title: i18n.SIGNAL_POST_FAILURE, error, dispatchToaster });
          }
        }
      }
      if (isSubscribed && !isFetchingData) {
        setLoading(false);
      }
    };

    fetchData();
    return () => {
      isSubscribed = false;
      abortCtrl.abort();
    };
  }, [dispatchToaster]);

  return { loading, ...signalIndex };
};
