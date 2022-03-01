/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import {
  ENDPOINT_EVENT_FILTERS_LIST_ID,
  ENDPOINT_TRUSTED_APPS_LIST_ID,
} from '@kbn/securitysolution-list-constants';
import { useNavigateToAppEventHandler } from '../../../../../../common/hooks/endpoint/use_navigate_to_app_event_handler';
import { useAppUrl } from '../../../../../../common/lib/kibana/hooks';
import {
  getPolicyEventFiltersPath,
  getEventFiltersListPath,
  getTrustedAppsListPath,
  getHostIsolationExceptionsListPath,
  getPolicyDetailsArtifactsListPath,
  getPolicyHostIsolationExceptionsPath,
} from '../../../../../common/routing';
import { APP_UI_ID } from '../../../../../../../common/constants';

export const useGetLinkTo = (
  policyId: string,
  policyName: string,
  listId: string,
  location?: Partial<{ show: 'create' }>
) => {
  const { getAppUrl } = useAppUrl();
  const { toRoutePath, toRouteUrl } = useMemo(() => {
    let path = '';
    if (listId === ENDPOINT_TRUSTED_APPS_LIST_ID) {
      path = getTrustedAppsListPath(location);
    } else if (listId === ENDPOINT_EVENT_FILTERS_LIST_ID) {
      path = getEventFiltersListPath(location);
    } else {
      path = getHostIsolationExceptionsListPath(location);
    }
    return {
      toRoutePath: path,
      toRouteUrl: getAppUrl({ path }),
    };
  }, [getAppUrl, listId, location]);

  const policyArtifactsPath = useMemo(() => {
    if (listId === ENDPOINT_TRUSTED_APPS_LIST_ID) {
      return getPolicyDetailsArtifactsListPath(policyId);
    } else if (listId === ENDPOINT_EVENT_FILTERS_LIST_ID) {
      return getPolicyEventFiltersPath(policyId);
    } else {
      return getPolicyHostIsolationExceptionsPath(policyId);
    }
  }, [listId, policyId]);

  const policyArtifactRouteState = useMemo(() => {
    return {
      backButtonLabel: i18n.translate(
        'xpack.securitySolution.endpoint.policy.artifacts.empty.unassigned.backButtonLabel',
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
          path: policyArtifactsPath,
        },
      ],
      backButtonUrl: getAppUrl({
        appId: APP_UI_ID,
        path: policyArtifactsPath,
      }),
    };
  }, [getAppUrl, policyName, policyArtifactsPath]);

  const onClickHandler = useNavigateToAppEventHandler(APP_UI_ID, {
    state: policyArtifactRouteState,
    path: toRoutePath,
  });

  return {
    onClickHandler,
    toRouteUrl,
    state: policyArtifactRouteState,
  };
};
