/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import {
  EuiCodeBlock,
  EuiDescriptionList,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import { AnalyticsCollection } from '../../../../../common/types/analytics';
import { getEnterpriseSearchUrl } from '../../../shared/enterprise_search_url';

interface AnalyticsCollectionIntegrateProps {
  collection: AnalyticsCollection;
}

export const AnalyticsCollectionIntegrate: React.FC<AnalyticsCollectionIntegrateProps> = ({
  collection,
}) => {
  const analyticsDNSUrl = getEnterpriseSearchUrl(`/analytics/api/collections/${collection.name}`);
  const credentials = [
    {
      title: i18n.translate(
        'xpack.enterpriseSearch.analytics.collections.collectionsView.integrateTab.credentials.collectionName',
        {
          defaultMessage: 'Collection name',
        }
      ),
      description: collection.name,
    },
    {
      title: i18n.translate(
        'xpack.enterpriseSearch.analytics.collections.collectionsView.integrateTab.credentials.collectionDns',
        {
          defaultMessage: 'DNS URL',
        }
      ),
      description: analyticsDNSUrl,
    },
  ];
  const webclientSrc = getEnterpriseSearchUrl('/analytics.js');

  return (
    <>
      <EuiTitle>
        <h4>
          {i18n.translate(
            'xpack.enterpriseSearch.analytics.collections.collectionsView.integrateTab.credentials.headingTitle',
            {
              defaultMessage: 'Credentials',
            }
          )}
        </h4>
      </EuiTitle>
      <EuiSpacer size="s" />
      <EuiPanel hasShadow={false} color="subdued" paddingSize="xl" grow={false}>
        <EuiDescriptionList listItems={credentials} type="column" align="center" />
      </EuiPanel>

      <EuiSpacer size="l" />

      <EuiTitle>
        <h4>
          {i18n.translate(
            'xpack.enterpriseSearch.analytics.collections.collectionsView.integrateTab.embed.headingTitle',
            {
              defaultMessage: 'Start tracking events',
            }
          )}
        </h4>
      </EuiTitle>
      <EuiSpacer size="s" />
      <EuiText size="s">
        <p>
          {i18n.translate(
            'xpack.enterpriseSearch.analytics.collections.collectionsView.integrateTab.embed.description',
            {
              defaultMessage:
                'Embed the JS snippet below on every page of the website or application you’d like to tracks.',
            }
          )}
        </p>
      </EuiText>
      <EuiSpacer size="s" />
      <EuiCodeBlock language="html" isCopyable>
        {`<script src="${webclientSrc}" data-dsn="${analyticsDNSUrl}" defer></script>`}
      </EuiCodeBlock>

      <EuiSpacer size="l" />
      <EuiText size="s">
        <p>
          {i18n.translate(
            'xpack.enterpriseSearch.analytics.collections.collectionsView.integrateTab.scriptDescription',
            {
              defaultMessage:
                'Track individual events, like clicks, by calling the <strong>trackEvent</strong> method.',
            }
          )}
        </p>
      </EuiText>
      <EuiSpacer size="s" />
      <EuiCodeBlock language="js" isCopyable>
        {`window.elasticAnalytics.trackEvent("click", {
  title: "Website Analytics",
  url: "www.elastic.co/analytics/overview"
})`}
      </EuiCodeBlock>
    </>
  );
};
