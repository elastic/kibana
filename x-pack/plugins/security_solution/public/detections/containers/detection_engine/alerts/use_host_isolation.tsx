/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { useCallback, useState } from 'react';
import { errorToToaster, useStateToaster } from '../../../../common/components/toasters';
import { isSecurityAppError } from '../../../../common/utils/api';
import { createHostIsolation } from './api';

interface HostIsolationStatus {
  loading: boolean;
  isolateHost: () => Promise<boolean>;
}

interface UseHostIsolationProps {
  agentId: string;
  comment: string;
}

export const useHostIsolation = ({
  agentId,
  comment,
}: UseHostIsolationProps): HostIsolationStatus => {
  const [loading, setLoading] = useState(false);
  const [, dispatchToaster] = useStateToaster();

  const isolateHost = useCallback(async () => {
    let isSubscribed = true;
    let isolated = false;

    try {
      setLoading(true);
      const isolationStatus = await createHostIsolation({ agentId, comment });

      if (isSubscribed && isolationStatus != null) {
        if (isolationStatus.action) {
          isolated = true;
        }
      }
    } catch (error) {
      if (isSubscribed) {
        isolated = false;
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

    isSubscribed = false;
    return isolated;
  }, [agentId, comment, dispatchToaster]);
  return { loading, isolateHost };
};
