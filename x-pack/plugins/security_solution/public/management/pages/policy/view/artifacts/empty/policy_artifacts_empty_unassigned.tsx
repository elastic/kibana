/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback } from 'react';
import { EuiButton, EuiEmptyPrompt, EuiPageTemplate, EuiLink } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { usePolicyDetailsArtifactsNavigateCallback } from '../../policy_hooks';
import { useGetLinkTo } from './use_policy_artifacts_empty_hooks';
import { useUserPrivileges } from '../../../../../../common/components/user_privileges';

interface CommonProps {
  policyId: string;
  policyName: string;
  listId: string;
}

export const PolicyArtifactsEmptyUnassigned = memo<CommonProps>(
  ({ policyId, policyName, listId }) => {
    const { canCreateArtifactsByPolicy } = useUserPrivileges().endpointPrivileges;
    const { onClickHandler, toRouteUrl } = useGetLinkTo(policyId, policyName, listId);

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
          title={
            <h2>
              <FormattedMessage
                id="xpack.securitySolution.endpoint.policy.artifacts.empty.unassigned.title"
                defaultMessage="No assigned [artifacts]"
              />
            </h2>
          }
          body={
            <FormattedMessage
              id="xpack.securitySolution.endpoint.policy.artifacts.empty.unassigned.content"
              defaultMessage="There are currently no [artifacts] assigned to {policyName}. Assign [artifacts] now or add and manage them on the [artifacts] page."
              values={{ policyName }}
            />
          }
          actions={[
            ...(canCreateArtifactsByPolicy
              ? [
                  <EuiButton
                    color="primary"
                    fill
                    onClick={onClickPrimaryButtonHandler}
                    data-test-subj="assign-artifacts-button"
                  >
                    <FormattedMessage
                      id="xpack.securitySolution.endpoint.policy.artifacts.empty.unassigned.primaryAction"
                      defaultMessage="Assign [artifacts]"
                    />
                  </EuiButton>,
                ]
              : []),
            // eslint-disable-next-line @elastic/eui/href-or-on-click
            <EuiLink onClick={onClickHandler} href={toRouteUrl}>
              <FormattedMessage
                id="xpack.securitySolution.endpoint.policy.artifacts.empty.unassigned.secondaryAction"
                defaultMessage="Manage [artifacts]"
              />
            </EuiLink>,
          ]}
        />
      </EuiPageTemplate>
    );
  }
);

PolicyArtifactsEmptyUnassigned.displayName = 'PolicyArtifactsEmptyUnassigned';
