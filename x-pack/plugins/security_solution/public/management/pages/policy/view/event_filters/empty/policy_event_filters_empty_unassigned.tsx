/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback } from 'react';
import { EuiButton, EuiEmptyPrompt, EuiPageTemplate, EuiLink } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { usePolicyDetailsNavigateCallback } from '../../policy_hooks';
import { useGetLinkTo } from './use_policy_event_filters_empty_hooks';
import { useUserPrivileges } from '../../../../../../common/components/user_privileges';

interface CommonProps {
  policyId: string;
  policyName: string;
}

export const PolicyEventFiltersEmptyUnassigned = memo<CommonProps>(({ policyId, policyName }) => {
  const { canCreateArtifactsByPolicy } = useUserPrivileges().endpointPrivileges;
  const { onClickHandler, toRouteUrl } = useGetLinkTo(policyId, policyName);

  const navigateCallback = usePolicyDetailsNavigateCallback();
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
        data-test-subj="policy-event-filters-empty-unassigned"
        title={
          <h2>
            <FormattedMessage
              id="xpack.securitySolution.endpoint.policy.eventFilters.empty.unassigned.title"
              defaultMessage="No assigned event filters"
            />
          </h2>
        }
        body={
          <FormattedMessage
            id="xpack.securitySolution.endpoint.policy.eventFilters.empty.unassigned.content"
            defaultMessage="There are currently no event filters assigned to {policyName}. Assign event filters now or add and manage them on the event filters page."
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
                  data-test-subj="assign-event-filter-button"
                >
                  <FormattedMessage
                    id="xpack.securitySolution.endpoint.policy.eventFilters.empty.unassigned.primaryAction"
                    defaultMessage="Assign event filters"
                  />
                </EuiButton>,
              ]
            : []),
          // eslint-disable-next-line @elastic/eui/href-or-on-click
          <EuiLink onClick={onClickHandler} href={toRouteUrl}>
            <FormattedMessage
              id="xpack.securitySolution.endpoint.policy.eventFilters.empty.unassigned.secondaryAction"
              defaultMessage="Manage event filters"
            />
          </EuiLink>,
        ]}
      />
    </EuiPageTemplate>
  );
});

PolicyEventFiltersEmptyUnassigned.displayName = 'PolicyEventFiltersEmptyUnassigned';
