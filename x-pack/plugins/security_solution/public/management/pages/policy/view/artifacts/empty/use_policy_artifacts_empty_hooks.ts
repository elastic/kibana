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
import { APP_UI_ID } from '../../../../../../../common/constants';
import { EventFiltersPageLocation } from '../../../../event_filters/types';
import { ArtifactListPageUrlParams } from '../../../../../components/artifact_list_page';

export const useGetLinkTo = (
  policyId: string,
  policyName: string,
  getPolicyArtifactsPath: (policyId: string) => string,
  getArtifactPath: (
    location?: Partial<EventFiltersPageLocation> | Partial<ArtifactListPageUrlParams>
  ) => string,
  location?: Partial<{ show: 'create' }>
) => {
  const { getAppUrl } = useAppUrl();
  const { toRoutePath, toRouteUrl } = useMemo(() => {
    const path = getArtifactPath(location);
    return {
      toRoutePath: path,
      toRouteUrl: getAppUrl({ path }),
    };
  }, [getAppUrl, getArtifactPath, location]);

  const policyArtifactsPath = getPolicyArtifactsPath(policyId);

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
