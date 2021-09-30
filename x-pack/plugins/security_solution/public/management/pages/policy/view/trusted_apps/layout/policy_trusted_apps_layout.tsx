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
import { getCurrentArtifactsLocation } from '../../../store/policy_details/selectors';
import { usePolicyDetailsNavigateCallback, usePolicyDetailsSelector } from '../../policy_hooks';
import { PolicyTrustedAppsFlyout } from '../flyout';

export const PolicyTrustedAppsLayout = React.memo(() => {
  const location = usePolicyDetailsSelector(getCurrentArtifactsLocation);
  const navigateCallback = usePolicyDetailsNavigateCallback();

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

  return (
    <div>
      {false ? (
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
        {true ? (
          <PolicyTrustedAppsEmptyUnassigned
            policyId={'bf16726e-f863-41db-ae8e-b5fd88aa1e5f'}
            policyName={'With eventing'}
          />
        ) : (
          <PolicyTrustedAppsEmptyUnexisting
            policyId={'bf16726e-f863-41db-ae8e-b5fd88aa1e5f'}
            policyName={'With eventing'}
          />
        )}
      </EuiPageContent>
      {showListFlyout ? <PolicyTrustedAppsFlyout /> : null}
    </div>
  );
});

PolicyTrustedAppsLayout.displayName = 'PolicyTrustedAppsLayout';
