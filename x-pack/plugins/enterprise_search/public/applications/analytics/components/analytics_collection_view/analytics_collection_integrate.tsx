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
  const analyticsDNSUrl = getEnterpriseSearchUrl(`/analytics/${collection.name}`) as string;
  const credentials = [
    {
      title: i18n.translate(
        'xpack.enterpriseSearch.analytics.collections.integrate.credentials.collectionName',
        {
          defaultMessage: 'Collection name',
        }
      ),
      description: collection.name,
    },
    {
      title: i18n.translate(
        'xpack.enterpriseSearch.analytics.collections.integrate.credentials.collectionDns',
        {
          defaultMessage: 'DNS URL',
        }
      ),
      description: analyticsDNSUrl,
    },
  ];

  return (
    <div className="entSearch__collectionIntegrateLayout">
      <EuiTitle>
        <h4>
          {i18n.translate(
            'xpack.enterpriseSearch.analytics.collections.integrate.credentials.headingTitle',
            {
              defaultMessage: 'Credentials',
            }
          )}
        </h4>
      </EuiTitle>
      <EuiSpacer size="s" />
      <EuiPanel hasShadow={false} color="subdued" paddingSize="xl" grow={false}>
        <EuiDescriptionList
          listItems={credentials}
          type="column"
          align="center"
          titleProps={{ className: 'entSearch__collectionCredentialTitle' }}
        />
      </EuiPanel>

      <EuiSpacer size="l" />

      <EuiTitle>
        <h4>
          {i18n.translate(
            'xpack.enterpriseSearch.analytics.collections.integrate.embed.headingTitle',
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
            'xpack.enterpriseSearch.analytics.collections.integrate.embed.description',
            {
              defaultMessage:
                'Embed the JS snippet below on every page of the website or application you’d like to tracks.',
            }
          )}
        </p>
      </EuiText>
      <EuiSpacer size="s" />
      <EuiCodeBlock language="html" isCopyable>
        {`<script src="${getEnterpriseSearchUrl(
          '/analytics.js'
        )}" data-dsn="${analyticsDNSUrl}" defer></script>`}
      </EuiCodeBlock>

      <EuiSpacer size="l" />
      <EuiText size="s">
        <p>
          {i18n.translate(
            'xpack.enterpriseSearch.analytics.collections.integrate.embed.scriptDescription',
            {
              defaultMessage:
                'Track individual events, like clicks, by calling the <strong>trackEvent</strong> method.',
            }
          )}
        </p>
      </EuiText>
      <EuiSpacer size="s" />
      <EuiCodeBlock language="js" isCopyable>
        {`window.elasticAnalytics.trackEvent("ResultClick", {
  title: "Website Analytics",
  url: "www.elasitc.co/analytics/website"
})`}
      </EuiCodeBlock>
    </div>
  );
};
