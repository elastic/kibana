/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { EuiSpacer, EuiTitle, EuiText, EuiButton } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { i18n } from '@kbn/i18n';

import { SetupGuide as SetupGuideLayout } from '../../../shared/setup_guide';

import { SetWorkplaceSearchBreadcrumbs as SetBreadcrumbs } from '../../../shared/kibana_breadcrumbs';
import { SendWorkplaceSearchTelemetry as SendTelemetry } from '../../../shared/telemetry';
import GettingStarted from '../../assets/getting_started.png';

const GETTING_STARTED_LINK_URL =
  'https://www.elastic.co/guide/en/workplace-search/current/workplace-search-getting-started.html';

export const SetupGuide: React.FC = () => {
  return (
    <SetupGuideLayout
      productName={i18n.translate('xpack.enterpriseSearch.workplaceSearch.productName', {
        defaultMessage: 'Workplace Search',
      })}
      productEuiIcon="logoWorkplaceSearch"
      standardAuthLink="https://www.elastic.co/guide/en/workplace-search/current/workplace-search-security.html#standard"
      elasticsearchNativeAuthLink="https://www.elastic.co/guide/en/workplace-search/current/workplace-search-security.html#elasticsearch-native-realm"
    >
      <SetBreadcrumbs text="Setup Guide" />
      <SendTelemetry action="viewed" metric="setup_guide" />

      <a href={GETTING_STARTED_LINK_URL} target="_blank" rel="noopener noreferrer">
        <img
          className="setupGuide__thumbnail"
          src={GettingStarted}
          alt={i18n.translate('xpack.enterpriseSearch.workplaceSearch.setupGuide.imageAlt', {
            defaultMessage:
              'Getting started with Workplace Search - a guide to show you how to get Workplace Search up and running',
          })}
          width="1280"
          height-="720"
        />
      </a>

      <EuiTitle size="s">
        <p>
          <FormattedMessage
            id="xpack.enterpriseSearch.workplaceSearch.setupGuide.description"
            defaultMessage="Elastic Workplace Search unifies your content platforms (Google Drive, Salesforce) into a personalized search experience."
          />
        </p>
      </EuiTitle>
      <EuiSpacer size="l" />
      <EuiButton target="_blank" fill href={GETTING_STARTED_LINK_URL} iconType="popout">
        Get started with Workplace Search
      </EuiButton>
      <EuiSpacer size="l" />
      <EuiText>
        <p>
          <FormattedMessage
            id="xpack.enterpriseSearch.workplaceSearch.setupGuide.notConfigured"
            defaultMessage="Workplace Search isn't configured in Kibana. Follow the instructions on this page."
          />
        </p>
      </EuiText>
    </SetupGuideLayout>
  );
};
