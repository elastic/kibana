/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { isEmpty } from 'lodash';
import { useEffect, useState } from 'react';
import { errorToToaster, useStateToaster } from '../../../../common/components/toasters';
import { isSecurityAppError } from '../../../../common/utils/api';
import { createHostIsolation } from './api';

interface HostIsolationStatus {
  loading: boolean;
  isIsolated: boolean;
}

interface UseHostIsolationProps {
  agentId: string;
}

export const useHostIsolation = ({ agentId }: UseHostIsolationProps): HostIsolationStatus => {
  const [loading, setLoading] = useState(true);
  const [isolated, setIsolated] = useState(false);
  const [, dispatchToaster] = useStateToaster();

  useEffect(() => {
    let isSubscribed = true;

    const fetchData = async () => {
      try {
        setLoading(true);
        const isolationStatus = await createHostIsolation({ agentId });

        if (isSubscribed && isolationStatus != null) {
          if (isolationStatus.action) {
            setIsolated(true);
          }
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

    if (!isEmpty(agentId)) {
      fetchData();
    }
    return () => {
      isSubscribed = false;
    };
  }, [agentId, dispatchToaster]);
  return { loading, isIsolated: isolated };
};
