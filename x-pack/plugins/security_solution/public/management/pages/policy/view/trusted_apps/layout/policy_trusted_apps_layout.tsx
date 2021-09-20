/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useState, useCallback } from 'react';

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
  EuiFlyoutFooter,
  EuiFlexGroup,
  EuiFlexItem,
  EuiButtonEmpty,
} from '@elastic/eui';
import {
  policyDetails,
  getCurrentArtifactsLocation,
  getAvailableArtifactsList,
  getAvailableArtifactsListIsLoading,
} from '../../../store/policy_details/selectors';
import { usePolicyDetailsNavigateCallback, usePolicyDetailsSelector } from '../../policy_hooks';
import { PolicyArtifactsList } from '../../artifacts/list';
import { SearchExceptions } from '../../../../../components/search_exceptions';

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

  const handleOnConfirmAction = useCallback(() => {}, []);
  const handleOnSearch = usePolicyDetailsNavigateCallback((filter) => ({
    filter,
  }));

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
          <SearchExceptions
            defaultValue={location.filter}
            onSearch={handleOnSearch}
            placeholder={i18n.translate(
              'xpack.securitySolution.endpoint.policy.trustedApps.layout.searh.label',
              {
                defaultMessage: 'Search trusted applications',
              }
            )}
          />
          <EuiSpacer size="m" />
          <PolicyArtifactsList
            artifacts={availableArtifactsList}
            defaultSelectedArtifactIds={[]}
            isListLoading={isAvailableArtifactsListLoading}
            selectedArtifactsUpdated={(artifactIds) => setSelectedArtifactIds(artifactIds)}
          />
        </EuiFlyoutBody>
        <EuiFlyoutFooter>
          <EuiFlexGroup justifyContent="spaceBetween">
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty
                data-test-subj="cancelPolicyTrustedAppsFlyout"
                onClick={handleListFlyoutClose}
              >
                <FormattedMessage
                  id="xpack.securitySolution.endpoint.policy.trustedApps.layout.flyout.cancel"
                  defaultMessage="Cancel"
                />
              </EuiButtonEmpty>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButton
                data-test-subj="confirmPolicyTrustedAppsFlyout"
                fill
                onClick={handleOnConfirmAction}
                isLoading={false}
              >
                <FormattedMessage
                  id="xpack.securitySolution.endpoint.policy.trustedApps.layout.flyout.confirm"
                  defaultMessage="Assing to {policyName}"
                  values={{ policyName }}
                />
              </EuiButton>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlyoutFooter>
      </EuiFlyout>
    ),
    [
      handleListFlyoutClose,
      policyName,
      location.filter,
      handleOnSearch,
      availableArtifactsList,
      isAvailableArtifactsListLoading,
      handleOnConfirmAction,
    ]
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
