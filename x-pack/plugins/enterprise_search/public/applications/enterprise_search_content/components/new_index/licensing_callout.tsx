/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { EuiCallOut, EuiFlexGroup, EuiFlexItem, EuiLink } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { docLinks } from '../../../shared/doc_links/doc_links';

export enum LICENSING_FEATURE {
  NATIVE_CONNECTOR = 'nativeConnector',
  CRAWLER = 'crawler',
  INFERENCE = 'inference',
}

type ContentBlock = Record<LICENSING_FEATURE, string>;

export const LicensingCallout: React.FC<{ feature: LICENSING_FEATURE }> = ({ feature }) => {
  const firstContentBlock: ContentBlock = {
    [LICENSING_FEATURE.NATIVE_CONNECTOR]: i18n.translate(
      'xpack.enterpriseSearch.content.licensingCallout.nativeConnector.contentOne',
      {
        defaultMessage:
          'Built-in connectors require a Platinum license or higher and are not available to Standard license self-managed deployments. You need to upgrade to use this feature.',
      }
    ),
    [LICENSING_FEATURE.CRAWLER]: i18n.translate(
      'xpack.enterpriseSearch.content.licensingCallout.crawler.contentOne',
      {
        defaultMessage:
          'The web crawler requires a Platinum license or higher and is not available to Standard license self-managed deployments. You need to upgrade to use this feature.',
      }
    ),
    [LICENSING_FEATURE.INFERENCE]: i18n.translate(
      'xpack.enterpriseSearch.content.licensingCallout.inference.contentOne',
      {
        defaultMessage:
          'Inference processors require a Platinum license or higher and are not available to Standard license self-managed deployments. You need to upgrade to use this feature.',
      }
    ),
  };

  const secondContentBlock: ContentBlock = {
    [LICENSING_FEATURE.NATIVE_CONNECTOR]: i18n.translate(
      'xpack.enterpriseSearch.content.licensingCallout.contentTwo',
      {
        defaultMessage:
          "Did you know that built-in connectors are available with a Standard Elastic Cloud license? Elastic Cloud gives you the flexibility to run where you want. Deploy our managed service on Google Cloud, Microsoft Azure, or Amazon Web Services, and we'll handle the maintenance and upkeep for you.",
      }
    ),
    [LICENSING_FEATURE.CRAWLER]: i18n.translate(
      'xpack.enterpriseSearch.content.licensingCallout.crawler.contentTwo',
      {
        defaultMessage:
          "Did you know that web crawlers are available with a Standard Elastic Cloud license? Elastic Cloud gives you the flexibility to run where you want. Deploy our managed service on Google Cloud, Microsoft Azure, or Amazon Web Services, and we'll handle the maintenance and upkeep for you.",
      }
    ),
    [LICENSING_FEATURE.INFERENCE]: i18n.translate(
      'xpack.enterpriseSearch.content.licensingCallout.inference.contentTwo',
      {
        defaultMessage:
          "Did you know that inference processors are available with a Standard Elastic Cloud license? Elastic Cloud gives you the flexibility to run where you want. Deploy our managed service on Google Cloud, Microsoft Azure, or Amazon Web Services, and we'll handle the maintenance and upkeep for you.",
      }
    ),
  };

  return (
    <EuiCallOut
      title={i18n.translate('xpack.enterpriseSearch.content.licensingCallout.title', {
        defaultMessage: 'Platinum features',
      })}
    >
      <p>{firstContentBlock[feature]}</p>
      <p>{secondContentBlock[feature]}</p>
      <EuiFlexGroup>
        <EuiFlexItem>
          <EuiLink external href={docLinks.licenseManagement}>
            {i18n.translate('xpack.enterpriseSearch.workplaceSearch.explorePlatinumFeatures.link', {
              defaultMessage: 'Explore Platinum features',
            })}
          </EuiLink>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiLink href="https://www.elastic.co/subscriptions/cloud" external>
            {i18n.translate('xpack.enterpriseSearch.content.licensingCallout.contentCloudTrial', {
              defaultMessage: 'Explore Enterprise Search on Elastic Cloud ',
            })}
          </EuiLink>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiCallOut>
  );
};
