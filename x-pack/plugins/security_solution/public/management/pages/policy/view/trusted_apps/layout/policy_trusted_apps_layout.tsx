/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useState } from 'react';

import { FormattedMessage } from '@kbn/i18n/react';
import { i18n } from '@kbn/i18n';
import {
  EuiButton,
  EuiTitle,
  EuiPageHeader,
  EuiPageHeaderSection,
  EuiPageContent,
  EuiFlyout,
  EuiFlyoutHeader,
  EuiFlyoutBody,
  EuiSpacer,
} from '@elastic/eui';
import {
  policyDetails,
  getCurrentArtifactsLocation,
  getAvailableArtifactsList,
  getAvailableArtifactsListIsLoading,
} from '../../../store/policy_details/selectors';
import { usePolicyDetailsNavigateCallback, usePolicyDetailsSelector } from '../../policy_hooks';
import { PolicyArtifactsList } from '../../artifacts/list';

export const PolicyTrustedAppsLayout = React.memo(() => {
  const [_, setSelectedArtifactIds] = useState<string[]>([]);
  const location = usePolicyDetailsSelector(getCurrentArtifactsLocation);
  const policyItem = usePolicyDetailsSelector(policyDetails);
  const availableArtifactsList = usePolicyDetailsSelector(getAvailableArtifactsList);
  const isAvailableArtifactsListLoading = usePolicyDetailsSelector(
    getAvailableArtifactsListIsLoading
  );

  const policyName = policyItem?.name ?? '';
  const showListFlyout = location.show === 'list';

  const handleListFlyoutClose = usePolicyDetailsNavigateCallback(() => ({
    show: undefined,
  }));

  const handleListFlyoutOpen = usePolicyDetailsNavigateCallback(() => ({
    show: 'list',
  }));

  const assignTrustedAppButton = useMemo(
    () => (
      <EuiButton fill iconType="plusInCircle" onClick={handleListFlyoutOpen}>
        {i18n.translate(
          'xpack.securitySolution.endpoint.policy.trustedApps.layout.assignToPolicy',
          {
            defaultMessage: 'Assign trusted applications to policy',
          }
        )}
      </EuiButton>
    ),
    [handleListFlyoutOpen]
  );

  const addArtifactsFlyout = useMemo(
    () => (
      <EuiFlyout onClose={handleListFlyoutClose}>
        <EuiFlyoutHeader hasBorder>
          <EuiTitle size="m">
            <h2>
              <FormattedMessage
                id="xpack.securitySolution.endpoint.policy.trustedApps.layout.flyout.title"
                defaultMessage="Assign trusted applications"
              />
            </h2>
          </EuiTitle>
          <EuiSpacer size="m" />
          <FormattedMessage
            id="xpack.securitySolution.endpoint.policy.trustedApps.layout.flyout.subtitle"
            defaultMessage="Select trusted applications to add to {policyName}"
            values={{ policyName }}
          />
        </EuiFlyoutHeader>
        <EuiFlyoutBody>
          <PolicyArtifactsList
            artifacts={availableArtifactsList}
            defaultSelectedArtifactIds={[]}
            isListLoading={isAvailableArtifactsListLoading}
            isSubmitLoading={false}
            selectedArtifactsUpdated={(artifactIds) => setSelectedArtifactIds(artifactIds)}
          />
        </EuiFlyoutBody>
      </EuiFlyout>
    ),
    [availableArtifactsList, handleListFlyoutClose, isAvailableArtifactsListLoading, policyName]
  );

  return (
    <div>
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
      <EuiPageContent
        hasBorder={false}
        hasShadow={false}
        paddingSize="none"
        color="transparent"
        borderRadius="none"
      >
        {/* TODO: To be implemented */}
        {'Policy trusted apps layout content'}
      </EuiPageContent>
      {showListFlyout ? addArtifactsFlyout : null}
    </div>
  );
});

PolicyTrustedAppsLayout.displayName = 'PolicyTrustedAppsLayout';
