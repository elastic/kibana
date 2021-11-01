/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback } from 'react';
import { EuiEmptyPrompt, EuiButton, EuiPageTemplate, EuiLink } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { usePolicyDetailsNavigateCallback } from '../../policy_hooks';
import { useGetLinkTo } from './use_policy_trusted_apps_empty_hooks';
import { useEndpointPrivileges } from '../../../../../../common/components/user_privileges/endpoint/use_endpoint_privileges';

interface CommonProps {
  policyId: string;
  policyName: string;
}

export const PolicyTrustedAppsEmptyUnassigned = memo<CommonProps>(({ policyId, policyName }) => {
  const { isPlatinumPlus } = useEndpointPrivileges();
  const navigateCallback = usePolicyDetailsNavigateCallback();
  const { onClickHandler, toRouteUrl } = useGetLinkTo(policyId, policyName);
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
        data-test-subj="policy-trusted-apps-empty-unassigned"
        title={
          <h2>
            <FormattedMessage
              id="xpack.securitySolution.endpoint.policy.trustedApps.empty.unassigned.title"
              defaultMessage="No assigned trusted applications"
            />
          </h2>
        }
        body={
          <FormattedMessage
            id="xpack.securitySolution.endpoint.policy.trustedApps.empty.unassigned.content"
            defaultMessage="There are currently no trusted applications assigned to {policyName}. Assign trusted applications now or add and manage them on the trusted applications page."
            values={{ policyName }}
          />
        }
        actions={[
          ...(isPlatinumPlus
            ? [
                <EuiButton
                  color="primary"
                  fill
                  onClick={onClickPrimaryButtonHandler}
                  data-test-subj="assign-ta-button"
                >
                  <FormattedMessage
                    id="xpack.securitySolution.endpoint.policy.trustedApps.empty.unassigned.primaryAction"
                    defaultMessage="Assign trusted applications"
                  />
                </EuiButton>,
              ]
            : []),
          // eslint-disable-next-line @elastic/eui/href-or-on-click
          <EuiLink onClick={onClickHandler} href={toRouteUrl}>
            <FormattedMessage
              id="xpack.securitySolution.endpoint.policy.trustedApps.empty.unassigned.secondaryAction"
              defaultMessage="Manage trusted applications"
            />
          </EuiLink>,
        ]}
      />
    </EuiPageTemplate>
  );
});

PolicyTrustedAppsEmptyUnassigned.displayName = 'PolicyTrustedAppsEmptyUnassigned';
