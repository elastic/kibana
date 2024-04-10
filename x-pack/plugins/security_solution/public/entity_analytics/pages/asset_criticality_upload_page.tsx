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
} from '@elastic/eui';
import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';

import { AssetCriticalityFileUploader } from '../components/asset_criticality_file_uploader/asset_criticality_file_uploader';
import { useKibana } from '../../common/lib/kibana';

export const AssetCriticalityUploadPage = () => {
  const { docLinks } = useKibana().services;
  const entityAnalyticsLinks = docLinks.links.securitySolution.entityAnalytics;
  return (
    <>
      <EuiPageHeader
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
                defaultMessage="Quickly Assign Asset Criticality with CSV Upload"
              />
            </h2>
          </EuiTitle>
          <EuiSpacer size="m" />
          <EuiText size="s">
            <FormattedMessage
              id="xpack.securitySolution.entityAnalytics.assetCriticalityUploadPage.description"
              defaultMessage="Effortlessly import asset criticality from your asset management tools via CSV. This simple upload ensures data accuracy and reduces manual input errors."
            />
          </EuiText>
          <EuiSpacer size="s" />
          <AssetCriticalityFileUploader />
        </EuiFlexItem>

        <EuiFlexItem grow={2}>
          <EuiPanel hasBorder={true} paddingSize="l" grow={false}>
            <EuiIcon type={'questionInCircle'} size={'xl'} />
            <EuiSpacer size="m" />
            <EuiTitle size="xxs">
              <h3>
                <FormattedMessage
                  id="xpack.securitySolution.entityAnalytics.assetCriticalityUploadPage.information.title"
                  defaultMessage="What is asset criticality??"
                />
              </h3>
            </EuiTitle>
            <EuiSpacer size="s" />
            <EuiText size="s">
              <FormattedMessage
                id="xpack.securitySolution.entityAnalytics.assetCriticalityUploadPage.information.description"
                defaultMessage="Allows you to classify assets based on their value and impact on business operations, to guide prioritization for alert triaging, threat-hunting, and investigation activities."
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
