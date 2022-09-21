/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { EuiCallOut, EuiFlexGroup, EuiFlexItem, EuiLink } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

import { docLinks } from '../../../shared/doc_links/doc_links';

export const LicensingCallout: React.FC = () => (
  <EuiCallOut
    title={i18n.translate('xpack.enterpriseSearch.content.licensingCallout.title', {
      defaultMessage: 'Platinum features',
    })}
  >
    <p>
      {i18n.translate('xpack.enterpriseSearch.content.licensingCallout.contentOne', {
        defaultMessage:
          'This feature requires a Platinum license or higher. From 8.5 this feature will be unavailable to Standard license self-managed deployments.',
      })}
    </p>
    <p>
      <FormattedMessage
        id="xpack.enterpriseSearch.content.licensingCallout.contentTwoDetail"
        defaultMessage="You will continue to be able to use web crawlers created in previous versions in 8.5. However, you won't be able to create {strongNew} web crawlers without a Platinum license or higher."
        values={{
          strongNew: (
            <strong>
              <FormattedMessage
                id="xpack.enterpriseSearch.content.licensingCallout.contentTwoStrongNew"
                defaultMessage="new"
              />
            </strong>
          ),
        }}
      />
    </p>
    <p>
      {i18n.translate('xpack.enterpriseSearch.content.licensingCallout.contentThree', {
        defaultMessage:
          "Did you know that the web crawler is available with a Standard Elastic Cloud license? Elastic Cloud gives you the flexibility to run where you want. Deploy our managed service on Google Cloud, Microsoft Azure, or Amazon Web Services, and we'll handle the maintenance and upkeep for you.",
      })}
    </p>
    <EuiFlexGroup>
      <EuiFlexItem>
        <EuiLink external href={docLinks.licenseManagement}>
          {i18n.translate('xpack.enterpriseSearch.workplaceSearch.explorePlatinumFeatures.link', {
            defaultMessage: 'Explore Platinum features',
          })}
        </EuiLink>
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiLink href="https://www.elastic.co/cloud/elasticsearch-service/signup" external>
          {i18n.translate('xpack.enterpriseSearch.content.licensingCallout.contentCloudTrial', {
            defaultMessage: 'Sign up for a free 14-day Elastic Cloud trial.',
          })}
        </EuiLink>
      </EuiFlexItem>
    </EuiFlexGroup>
  </EuiCallOut>
);
