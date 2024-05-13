/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiIcon,
  EuiLink,
  EuiPageHeader,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
  EuiEmptyPrompt,
  EuiCallOut,
  EuiCode,
} from '@elastic/eui';
import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { ASSET_CRITICALITY_INDEX_PATTERN } from '../../../common/entity_analytics/asset_criticality';
import { useUiSetting$, useKibana } from '../../common/lib/kibana';
import { ENABLE_ASSET_CRITICALITY_SETTING } from '../../../common/constants';
import { AssetCriticalityFileUploader } from '../components/asset_criticality_file_uploader/asset_criticality_file_uploader';
import { useAssetCriticalityPrivileges } from '../components/asset_criticality/use_asset_criticality';
import { useHasSecurityCapability } from '../../helper_hooks';

export const AssetCriticalityUploadPage = () => {
  const { docLinks } = useKibana().services;
  const entityAnalyticsLinks = docLinks.links.securitySolution.entityAnalytics;
  const hasEntityAnalyticsCapability = useHasSecurityCapability('entity-analytics');
  const [isAssetCriticalityEnabled] = useUiSetting$<boolean>(ENABLE_ASSET_CRITICALITY_SETTING);
  const {
    data: privileges,
    error: privilegesError,
    isLoading,
  } = useAssetCriticalityPrivileges('AssetCriticalityUploadPage');
  const hasWritePermissions = privileges?.has_write_permissions;

  if (isLoading) {
    // Wait for permission before rendering content to avoid flickering
    return null;
  }

  if (
    !hasEntityAnalyticsCapability ||
    !isAssetCriticalityEnabled ||
    privilegesError?.body.status_code === 403
  ) {
    const errorMessage = privilegesError?.body.message ?? (
      <FormattedMessage
        id="xpack.securitySolution.entityAnalytics.assetCriticalityUploadPage.advancedSettingDisabledMessage"
        defaultMessage='Please enable "{ENABLE_ASSET_CRITICALITY_SETTING}" on advanced settings to access the page.'
        values={{
          ENABLE_ASSET_CRITICALITY_SETTING,
        }}
      />
    );

    return (
      <EuiEmptyPrompt
        iconType="warning"
        title={
          <h2>
            <FormattedMessage
              id="xpack.securitySolution.entityAnalytics.assetCriticalityUploadPage.advancedSettingDisabledTitle"
              defaultMessage="This page is disabled"
            />
          </h2>
        }
        body={<p>{errorMessage}</p>}
      />
    );
  }

  if (!hasWritePermissions) {
    return (
      <EuiCallOut
        title={
          <FormattedMessage
            id="xpack.securitySolution.entityAnalytics.assetCriticalityUploadPage.noPermissionTitle"
            defaultMessage="Insufficient index privileges to access this page"
          />
        }
        color="primary"
        iconType="iInCircle"
      >
        <EuiText size="s">
          <FormattedMessage
            id="xpack.securitySolution.entityAnalytics.assetCriticalityUploadPage.missingPermissionsCallout.description"
            defaultMessage="Write permission is required for the {index} index pattern in order to access this page. Contact your administrator for further assistance."
            values={{
              index: <EuiCode>{ASSET_CRITICALITY_INDEX_PATTERN}</EuiCode>,
            }}
          />
        </EuiText>
      </EuiCallOut>
    );
  }

  return (
    <>
      <EuiPageHeader
        data-test-subj="assetCriticalityUploadPage"
        pageTitle={
          <FormattedMessage
            id="xpack.securitySolution.entityAnalytics.assetCriticalityUploadPage.title"
            defaultMessage="Asset criticality"
          />
        }
      />
      <EuiHorizontalRule />
      <EuiSpacer size="l" />
      <EuiFlexGroup gutterSize="xl">
        <EuiFlexItem grow={3}>
          <EuiTitle size="s">
            <h2>
              <FormattedMessage
                id="xpack.securitySolution.entityAnalytics.assetCriticalityUploadPage.subTitle"
                defaultMessage="Import your asset criticality data"
              />
            </h2>
          </EuiTitle>
          <EuiSpacer size="m" />
          <EuiText size="s">
            <FormattedMessage
              id="xpack.securitySolution.entityAnalytics.assetCriticalityUploadPage.description"
              defaultMessage="Bulk assign asset criticality by importing a CSV, TXT, or TSV file exported from your asset management tools. This ensures data accuracy and reduces manual input errors."
            />
          </EuiText>
          <EuiSpacer size="s" />
          <AssetCriticalityFileUploader />
        </EuiFlexItem>

        <EuiFlexItem grow={2}>
          <EuiPanel hasBorder={true} paddingSize="l" grow={false}>
            <EuiIcon type="questionInCircle" size="xl" />
            <EuiSpacer size="m" />
            <EuiTitle size="xxs">
              <h3>
                <FormattedMessage
                  id="xpack.securitySolution.entityAnalytics.assetCriticalityUploadPage.information.title"
                  defaultMessage="What is asset criticality?"
                />
              </h3>
            </EuiTitle>
            <EuiSpacer size="s" />
            <EuiText size="s">
              <FormattedMessage
                id="xpack.securitySolution.entityAnalytics.assetCriticalityUploadPage.information.description"
                defaultMessage="Asset criticality allows you to classify entities based on their importance and impact on business operations. Use asset criticality to guide prioritization for alert triaging, threat-hunting, and investigation activities."
              />
            </EuiText>
            <EuiHorizontalRule />
            <EuiTitle size="xxs">
              <h4>
                <FormattedMessage
                  id="xpack.securitySolution.entityAnalytics.assetCriticalityUploadPage.information.usefulLinks"
                  defaultMessage="Useful links"
                />
              </h4>
            </EuiTitle>
            <EuiSpacer size="xs" />

            <EuiLink
              target="_blank"
              rel="noopener nofollow noreferrer"
              href={entityAnalyticsLinks.assetCriticality}
            >
              <FormattedMessage
                id="xpack.securitySolution.entityAnalytics.assetCriticalityUploadPage.documentationLink"
                defaultMessage="Asset criticality documentation"
              />
            </EuiLink>
          </EuiPanel>
        </EuiFlexItem>
      </EuiFlexGroup>
    </>
  );
};

AssetCriticalityUploadPage.displayName = 'AssetCriticalityUploadPage';
