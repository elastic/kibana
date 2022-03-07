/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import { useNavigateToAppEventHandler } from '../../../../../../common/hooks/endpoint/use_navigate_to_app_event_handler';
import { useAppUrl } from '../../../../../../common/lib/kibana/hooks';
import {
  getPolicyHostIsolationExceptionsPath,
  getHostIsolationExceptionsListPath,
} from '../../../../../common/routing';
import { APP_UI_ID } from '../../../../../../../common/constants';
import { HostIsolationExceptionsPageLocation } from '../../../../host_isolation_exceptions/types';

export const useGetLinkTo = (
  policyId: string,
  policyName: string,
  location?: Partial<HostIsolationExceptionsPageLocation>
) => {
  const { getAppUrl } = useAppUrl();
  const { toRoutePath, toRouteUrl } = useMemo(() => {
    const path = getHostIsolationExceptionsListPath(location);
    return {
      toRoutePath: path,
      toRouteUrl: getAppUrl({ path }),
    };
  }, [getAppUrl, location]);

  const policyHostIsolationExceptionsPath = useMemo(
    () => getPolicyHostIsolationExceptionsPath(policyId),
    [policyId]
  );
  const policyHostIsolationExceptionsRouteState = useMemo(() => {
    return {
      backButtonLabel: i18n.translate(
        'xpack.securitySolution.endpoint.policy.hostIsolationExceptions.empty.unassigned.backButtonLabel',
        {
          defaultMessage: 'Back to {policyName} policy',
          values: {
            policyName,
          },
        }
      ),
      onBackButtonNavigateTo: [
        APP_UI_ID,
        {
          path: policyHostIsolationExceptionsPath,
        },
      ],
      backButtonUrl: getAppUrl({
        appId: APP_UI_ID,
        path: policyHostIsolationExceptionsPath,
      }),
    };
  }, [getAppUrl, policyName, policyHostIsolationExceptionsPath]);

  const onClickHandler = useNavigateToAppEventHandler(APP_UI_ID, {
    state: policyHostIsolationExceptionsRouteState,
    path: toRoutePath,
  });

  return {
    onClickHandler,
    toRouteUrl,
    state: policyHostIsolationExceptionsRouteState,
  };
};
