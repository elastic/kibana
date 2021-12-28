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
import { getPolicyEventFiltersPath, getEventFiltersListPath } from '../../../../../common/routing';
import { APP_UI_ID } from '../../../../../../../common/constants';

export const useGetLinkTo = (policyId: string, policyName: string) => {
  const { getAppUrl } = useAppUrl();
  const { toRoutePath, toRouteUrl } = useMemo(() => {
    const path = getEventFiltersListPath();
    return {
      toRoutePath: path,
      toRouteUrl: getAppUrl({ path }),
    };
  }, [getAppUrl]);

  const policyEventFiltersPath = useMemo(() => getPolicyEventFiltersPath(policyId), [policyId]);
  const policyEventFilterRouteState = useMemo(() => {
    return {
      backButtonLabel: i18n.translate(
        'xpack.securitySolution.endpoint.policy.eventFilters.empty.unassigned.backButtonLabel',
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
          path: policyEventFiltersPath,
        },
      ],
      backButtonUrl: getAppUrl({
        appId: APP_UI_ID,
        path: policyEventFiltersPath,
      }),
    };
  }, [getAppUrl, policyName, policyEventFiltersPath]);

  const onClickHandler = useNavigateToAppEventHandler(APP_UI_ID, {
    state: policyEventFilterRouteState,
    path: toRoutePath,
  });

  return {
    onClickHandler,
    toRouteUrl,
  };
};
