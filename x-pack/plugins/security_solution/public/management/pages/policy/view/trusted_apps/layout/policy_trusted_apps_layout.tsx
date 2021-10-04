/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiButton,
  EuiTitle,
  EuiPageHeader,
  EuiPageHeaderSection,
  EuiPageContent,
} from '@elastic/eui';
import { PolicyTrustedAppsEmptyUnassigned, PolicyTrustedAppsEmptyUnexisting } from '../empty';
import {
  getCurrentArtifactsLocation,
  getDoesTrustedAppExists,
  policyDetails,
  doesPolicyHaveTrustedApps,
  doesTrustedAppExistsLoading,
} from '../../../store/policy_details/selectors';
import { usePolicyDetailsNavigateCallback, usePolicyDetailsSelector } from '../../policy_hooks';
import { PolicyTrustedAppsFlyout } from '../flyout';
import { PolicyTrustedAppsList } from '../list/policy_trusted_apps_list';

export const PolicyTrustedAppsLayout = React.memo(() => {
  const location = usePolicyDetailsSelector(getCurrentArtifactsLocation);
  const doesTrustedAppExists = usePolicyDetailsSelector(getDoesTrustedAppExists);
  const isDoesTrustedAppExistsLoading = usePolicyDetailsSelector(doesTrustedAppExistsLoading);
  const policyItem = usePolicyDetailsSelector(policyDetails);
  const navigateCallback = usePolicyDetailsNavigateCallback();
  const hasAssignedTrustedApps = usePolicyDetailsSelector(doesPolicyHaveTrustedApps);

  const showListFlyout = location.show === 'list';

  const assignTrustedAppButton = useMemo(
    () => (
      <EuiButton
        fill
        iconType="plusInCircle"
        onClick={() =>
          navigateCallback({
            show: 'list',
          })
        }
      >
        {i18n.translate(
          'xpack.securitySolution.endpoint.policy.trustedApps.layout.assignToPolicy',
          {
            defaultMessage: 'Assign trusted applications to policy',
          }
        )}
      </EuiButton>
    ),
    [navigateCallback]
  );

  const displaysEmptyState = useMemo(
    () =>
      !isDoesTrustedAppExistsLoading &&
      !hasAssignedTrustedApps.loading &&
      !hasAssignedTrustedApps.hasTrustedApps,
    [
      hasAssignedTrustedApps.hasTrustedApps,
      hasAssignedTrustedApps.loading,
      isDoesTrustedAppExistsLoading,
    ]
  );

  const displaysEmptyStateIsLoading = useMemo(
    () => isDoesTrustedAppExistsLoading || hasAssignedTrustedApps.loading,
    [hasAssignedTrustedApps.loading, isDoesTrustedAppExistsLoading]
  );

  return policyItem ? (
    <div>
      {!displaysEmptyStateIsLoading && !displaysEmptyState ? (
        <EuiPageHeader alignItems="center">
          <EuiPageHeaderSection>
            <EuiTitle size="m">
              <h2>
                {i18n.translate('xpack.securitySolution.endpoint.policy.trustedApps.layout.title', {
                  defaultMessage: 'Assigned trusted applications',
                })}
              </h2>
            </EuiTitle>
          </EuiPageHeaderSection>
          <EuiPageHeaderSection>{assignTrustedAppButton}</EuiPageHeaderSection>
        </EuiPageHeader>
      ) : null}
      <EuiPageContent
        hasBorder={false}
        hasShadow={false}
        paddingSize="none"
        color="transparent"
        borderRadius="none"
      >
        {displaysEmptyState ? (
          doesTrustedAppExists ? (
            <PolicyTrustedAppsEmptyUnassigned
              policyId={policyItem.id}
              policyName={policyItem.name}
            />
          ) : (
            <PolicyTrustedAppsEmptyUnexisting
              policyId={policyItem.id}
              policyName={policyItem.name}
            />
          )
        ) : (
          <PolicyTrustedAppsList />
        )}
      </EuiPageContent>
      {showListFlyout ? <PolicyTrustedAppsFlyout /> : null}
    </div>
  ) : null;
});

PolicyTrustedAppsLayout.displayName = 'PolicyTrustedAppsLayout';
