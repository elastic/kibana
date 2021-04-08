/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { useEffect, useState } from 'react';
import { errorToToaster, useStateToaster } from '../../../../common/components/toasters';
import { isSecurityAppError } from '../../../../common/utils/api';
import { someAPICall } from './api';

interface HostIsolationIndex {
  loading: boolean;
  isIsolated: boolean;
}

interface UseSomeHookProps {
  hostId: string;
}

export const useSomeHook = ({ hostId }: UseSomeHookProps): HostIsolationIndex => {
  const [loading, setLoading] = useState(true);
  const [isolated, setIsolated] = useState(false);
  const [, dispatchToaster] = useStateToaster();

  useEffect(() => {
    let isSubscribed = true;

    const fetchData = async () => {
      try {
        setLoading(true);
        const isolationStatus = await someAPICall({ hostId });

        if (isSubscribed && isolationStatus != null) {
          setIsolated(true);
        }
      } catch (error) {
        if (isSubscribed) {
          setIsolated(false);
        }
        // 500 error
        if (isSecurityAppError(error) && error.body.status_code !== 404) {
          errorToToaster({
            title: i18n.translate('xpack.securitySolution.hostIsolation.apiError', {
              defaultMessage: 'Stuff went wrong',
            }),
            error,
            dispatchToaster,
          });
        }
      }
      if (isSubscribed) {
        setLoading(false);
      }
    };

    fetchData();
    return () => {
      isSubscribed = false;
    };
  });
  return { loading, isIsolated: isolated };
};
