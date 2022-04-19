/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback } from 'react';
import { EuiButton, EuiEmptyPrompt, EuiPageTemplate, EuiLink } from '@elastic/eui';
import { usePolicyDetailsArtifactsNavigateCallback } from '../../policy_hooks';
import { useGetLinkTo } from './use_policy_artifacts_empty_hooks';
import { useUserPrivileges } from '../../../../../../common/components/user_privileges';
import { POLICY_ARTIFACT_EMPTY_UNASSIGNED_LABELS } from './translations';
import { EventFiltersPageLocation } from '../../../../event_filters/types';
import { TrustedAppsListPageLocation } from '../../../../trusted_apps/state';
import { ArtifactListPageUrlParams } from '../../../../../components/artifact_list_page';
interface CommonProps {
  policyId: string;
  policyName: string;
  listId: string;
  labels: typeof POLICY_ARTIFACT_EMPTY_UNASSIGNED_LABELS;
  getPolicyArtifactsPath: (policyId: string) => string;
  getArtifactPath: (
    location?:
      | Partial<EventFiltersPageLocation>
      | Partial<TrustedAppsListPageLocation>
      | Partial<ArtifactListPageUrlParams>
  ) => string;
}

export const PolicyArtifactsEmptyUnassigned = memo<CommonProps>(
  ({ policyId, policyName, listId, labels, getPolicyArtifactsPath, getArtifactPath }) => {
    const { canCreateArtifactsByPolicy } = useUserPrivileges().endpointPrivileges;
    const { onClickHandler, toRouteUrl } = useGetLinkTo(
      policyId,
      policyName,
      getPolicyArtifactsPath,
      getArtifactPath
    );

    const navigateCallback = usePolicyDetailsArtifactsNavigateCallback(listId);
    const onClickPrimaryButtonHandler = useCallback(
      () =>
        navigateCallback({
          show: 'list',
        }),
      [navigateCallback]
    );
    return (
      <EuiPageTemplate template="centeredContent">
        <EuiEmptyPrompt
          iconType="plusInCircle"
          data-test-subj="policy-artifacts-empty-unassigned"
          title={<h2>{labels.emptyUnassignedTitle}</h2>}
          body={labels.emptyUnassignedMessage(policyName)}
          actions={[
            ...(canCreateArtifactsByPolicy
              ? [
                  <EuiButton
                    color="primary"
                    fill
                    onClick={onClickPrimaryButtonHandler}
                    data-test-subj="assign-artifacts-button"
                  >
                    {labels.emptyUnassignedPrimaryActionButtonTitle}
                  </EuiButton>,
                ]
              : []),
            // eslint-disable-next-line @elastic/eui/href-or-on-click
            <EuiLink onClick={onClickHandler} href={toRouteUrl}>
              {labels.emptyUnassignedSecondaryActionButtonTitle}
            </EuiLink>,
          ]}
        />
      </EuiPageTemplate>
    );
  }
);

PolicyArtifactsEmptyUnassigned.displayName = 'PolicyArtifactsEmptyUnassigned';
