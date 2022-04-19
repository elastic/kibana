/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useState, useCallback, useEffect } from 'react';
import { i18n } from '@kbn/i18n';

import {
  useStartServices,
  sendGenerateServiceToken,
  useGetEnrollmentAPIKeys,
} from '../../../hooks';
import { SO_SEARCH_LIMIT } from '../../../constants';

export const useServiceToken = ({ fleetServerPolicyId }: { fleetServerPolicyId?: string } = {}) => {
  const { notifications } = useStartServices();
  const [serviceToken, setServiceToken] = useState<string>();
  const [isLoadingServiceToken, setIsLoadingServiceToken] = useState<boolean>(false);
  const { data: enrollmentKeys } = useGetEnrollmentAPIKeys({ perPage: SO_SEARCH_LIMIT });

  // Set the initial service token value to the first one found for the given policy if possible
  useEffect(() => {
    if (fleetServerPolicyId && enrollmentKeys?.items) {
      const serviceTokenForPolicy = enrollmentKeys.items.find(
        (item) => item.policy_id === fleetServerPolicyId
      );

      if (serviceTokenForPolicy) {
        setServiceToken(serviceTokenForPolicy.api_key);
      }
    }
  }, [enrollmentKeys, fleetServerPolicyId]);

  const generateServiceToken = useCallback(async () => {
    setIsLoadingServiceToken(true);
    try {
      const { data } = await sendGenerateServiceToken();
      if (data?.value) {
        setServiceToken(data?.value);
      }
    } catch (err) {
      notifications.toasts.addError(err, {
        title: i18n.translate('xpack.fleet.fleetServerSetup.errorGeneratingTokenTitleText', {
          defaultMessage: 'Error generating token',
        }),
      });
    } finally {
      setIsLoadingServiceToken(false);
    }
  }, [notifications.toasts]);

  return { serviceToken, isLoadingServiceToken, generateServiceToken };
};
