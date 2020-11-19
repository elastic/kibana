/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { EuiSpacer, EuiTitle, EuiText } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { i18n } from '@kbn/i18n';

import { ENTERPRISE_SEARCH_PLUGIN } from '../../../../../common/constants';
import { SetupGuide as SetupGuideLayout, SETUP_GUIDE_TITLE } from '../../../shared/setup_guide';
import { SetEnterpriseSearchChrome as SetPageChrome } from '../../../shared/kibana_chrome';
import { SendEnterpriseSearchTelemetry as SendTelemetry } from '../../../shared/telemetry';
import GettingStarted from './assets/getting_started.png';

export const SetupGuide: React.FC = () => (
  <SetupGuideLayout
    productName={ENTERPRISE_SEARCH_PLUGIN.NAME}
    productEuiIcon="logoEnterpriseSearch"
    standardAuthLink="https://www.elastic.co/guide/en/app-search/current/security-and-users.html#app-search-self-managed-security-and-user-management-standard"
    elasticsearchNativeAuthLink="https://www.elastic.co/guide/en/app-search/current/security-and-users.html#app-search-self-managed-security-and-user-management-elasticsearch-native-realm"
  >
    <SetPageChrome trail={[SETUP_GUIDE_TITLE]} />
    <SendTelemetry action="viewed" metric="setup_guide" />

    <a href="https://www.elastic.co/enterprise-search" target="_blank" rel="noopener noreferrer">
      <img
        className="setupGuide__thumbnail"
        src={GettingStarted}
        alt={i18n.translate('xpack.enterpriseSearch.enterpriseSearch.setupGuide.videoAlt', {
          defaultMessage: 'Getting started with Enterprise Search',
        })}
        width="1280"
        height-="720"
      />
    </a>

    <EuiTitle size="s">
      <p>
        <FormattedMessage
          id="xpack.enterpriseSearch.enterpriseSearch.setupGuide.description"
          defaultMessage="Search everything, anywhere. Easily implement powerful, modern search experiences for your busy team. Quickly add pre-tuned search to your website, app, or workplace. Search it all, simply."
        />
      </p>
    </EuiTitle>
    <EuiSpacer size="m" />
    <EuiText>
      <p>
        <FormattedMessage
          id="xpack.enterpriseSearch.enterpriseSearch.setupGuide.notConfigured"
          defaultMessage="Enterprise Search is not configured in your Kibana instance yet."
        />
      </p>
    </EuiText>
  </SetupGuideLayout>
);
