/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { useEffect, useCallback, useState } from 'react';

import { FLEET_SERVER_PACKAGE, PACKAGE_POLICY_SAVED_OBJECT_TYPE } from '../../../constants';
import { sendGetAgentStatus, sendGetPackagePolicies, useStartServices } from '../../../hooks';

export function useFleetServerUnhealthy() {
  const { notifications } = useStartServices();
  const [isLoading, setIsLoading] = useState(true);
  const [isUnhealthy, setIsUnhealthy] = useState(false);
  const fetchData = useCallback(async () => {
    try {
      const packagePoliciesRes = await sendGetPackagePolicies({
        page: 1,
        perPage: 10000,
        kuery: `${PACKAGE_POLICY_SAVED_OBJECT_TYPE}.package.name:${FLEET_SERVER_PACKAGE}`,
      });

      if (packagePoliciesRes.error) {
        throw packagePoliciesRes.error;
      }

      const agentPolicyIds = [
        ...new Set(packagePoliciesRes.data?.items.map((p) => p.policy_id) ?? []),
      ];

      if (agentPolicyIds.length > 0) {
        const agentStatusesRes = await sendGetAgentStatus({
          kuery: agentPolicyIds.map((policyId) => `policy_id:"${policyId}"`).join(' or '),
        });

        if (agentStatusesRes.error) {
          throw agentStatusesRes.error;
        }

        if (
          agentStatusesRes.data?.results.online === 0 &&
          agentStatusesRes.data?.results.updating === 0
        ) {
          setIsUnhealthy(true);
        }
      }

      setIsLoading(false);
    } catch (err) {
      notifications.toasts.addError(err, {
        title: i18n.translate('xpack.fleet.fleetServerUnhealthy.requestError', {
          defaultMessage: 'An error happened while fetching fleet server status',
        }),
      });
      setIsLoading(false);
    }
  }, [notifications.toasts]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    isLoading,
    isUnhealthy,
  };
}
