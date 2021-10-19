/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import {
  EuiButton,
  EuiTitle,
  EuiPageHeader,
  EuiPageHeaderSection,
  EuiPageContent,
  EuiText,
  EuiSpacer,
  EuiLink,
} from '@elastic/eui';
import { PolicyTrustedAppsEmptyUnassigned, PolicyTrustedAppsEmptyUnexisting } from '../empty';
import {
  getCurrentArtifactsLocation,
  getDoesTrustedAppExists,
  policyDetails,
  doesPolicyHaveTrustedApps,
  doesTrustedAppExistsLoading,
  getPolicyTrustedAppsListPagination,
} from '../../../store/policy_details/selectors';
import { usePolicyDetailsNavigateCallback, usePolicyDetailsSelector } from '../../policy_hooks';
import { PolicyTrustedAppsFlyout } from '../flyout';
import { PolicyTrustedAppsList } from '../list/policy_trusted_apps_list';
import { useEndpointPrivileges } from '../../../../../../common/components/user_privileges/endpoint/use_endpoint_privileges';
import { useAppUrl } from '../../../../../../common/lib/kibana';
import { APP_ID } from '../../../../../../../common/constants';
import { getTrustedAppsListPath } from '../../../../../common/routing';

export const PolicyTrustedAppsLayout = React.memo(() => {
  const { getAppUrl } = useAppUrl();
  const location = usePolicyDetailsSelector(getCurrentArtifactsLocation);
  const doesTrustedAppExists = usePolicyDetailsSelector(getDoesTrustedAppExists);
  const isDoesTrustedAppExistsLoading = usePolicyDetailsSelector(doesTrustedAppExistsLoading);
  const policyItem = usePolicyDetailsSelector(policyDetails);
  const navigateCallback = usePolicyDetailsNavigateCallback();
  const hasAssignedTrustedApps = usePolicyDetailsSelector(doesPolicyHaveTrustedApps);
  const { isPlatinumPlus } = useEndpointPrivileges();
  const totalAssignedCount = usePolicyDetailsSelector(
    getPolicyTrustedAppsListPagination
  ).totalItemCount;

  const showListFlyout = location.show === 'list';

  const assignTrustedAppButton = useMemo(
    () => (
      <EuiButton
        fill
        iconType="plusInCircle"
        data-test-subj="assignTrustedAppButton"
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

  const aboutInfo = useMemo(() => {
    const link = (
      <EuiLink href={getAppUrl({ appId: APP_ID, path: getTrustedAppsListPath() })} target="_blank">
        <FormattedMessage
          id="xpack.securitySolution.endpoint.policy.trustedApps.layout.about.viewAllLinkLabel"
          defaultMessage="view all trusted applications"
        />
      </EuiLink>
    );

    return (
      <FormattedMessage
        id="xpack.securitySolution.endpoint.policy.trustedApps.layout.about"
        defaultMessage="There {count, plural, one {is} other {are}} {count} trusted {count, plural, =1 {application} other {applications}} associated with this policy. Click here to {link}"
        values={{
          count: totalAssignedCount,
          link,
        }}
      />
    );
  }, [getAppUrl, totalAssignedCount]);

  return policyItem ? (
    <div>
      {!displaysEmptyStateIsLoading && !displaysEmptyState ? (
        <>
          <EuiPageHeader alignItems="center">
            <EuiPageHeaderSection>
              <EuiTitle size="m">
                <h2>
                  {i18n.translate(
                    'xpack.securitySolution.endpoint.policy.trustedApps.layout.title',
                    {
                      defaultMessage: 'Assigned trusted applications',
                    }
                  )}
                </h2>
              </EuiTitle>

              <EuiSpacer size="s" />

              <EuiText size="xs">
                <p>{aboutInfo}</p>
              </EuiText>
            </EuiPageHeaderSection>

            <EuiPageHeaderSection>{isPlatinumPlus && assignTrustedAppButton}</EuiPageHeaderSection>
          </EuiPageHeader>

          <EuiSpacer size="m" />
        </>
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
          <PolicyTrustedAppsList hideTotalShowingLabel={true} />
        )}
      </EuiPageContent>
      {isPlatinumPlus && showListFlyout ? <PolicyTrustedAppsFlyout /> : null}
    </div>
  ) : null;
});

PolicyTrustedAppsLayout.displayName = 'PolicyTrustedAppsLayout';
