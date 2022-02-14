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
import { getPolicyTrustedAppsPath, getTrustedAppsListPath } from '../../../../../common/routing';
import { APP_UI_ID } from '../../../../../../../common/constants';
import { TrustedAppsListPageLocation } from '../../../../trusted_apps/state';

export const useGetLinkTo = (
  policyId: string,
  policyName: string,
  location?: Partial<TrustedAppsListPageLocation>
) => {
  const { getAppUrl } = useAppUrl();
  const { toRoutePath, toRouteUrl } = useMemo(() => {
    const path = getTrustedAppsListPath(location);
    return {
      toRoutePath: path,
      toRouteUrl: getAppUrl({ path }),
    };
  }, [getAppUrl, location]);

  const policyTrustedAppsPath = useMemo(() => getPolicyTrustedAppsPath(policyId), [policyId]);
  const policyTrustedAppRouteState = useMemo(() => {
    return {
      backButtonLabel: i18n.translate(
        'xpack.securitySolution.endpoint.policy.trustedApps.empty.unassigned.backButtonLabel',
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
          path: policyTrustedAppsPath,
        },
      ],
      backButtonUrl: getAppUrl({
        appId: APP_UI_ID,
        path: policyTrustedAppsPath,
      }),
    };
  }, [getAppUrl, policyName, policyTrustedAppsPath]);

  const onClickHandler = useNavigateToAppEventHandler(APP_UI_ID, {
    state: policyTrustedAppRouteState,
    path: toRoutePath,
  });

  return {
    onClickHandler,
    toRouteUrl,
    state: policyTrustedAppRouteState,
  };
};
