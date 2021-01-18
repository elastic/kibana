/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { EuiSpacer, EuiTitle, EuiText, EuiButton, EuiLink } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { i18n } from '@kbn/i18n';

import { WORKPLACE_SEARCH_PLUGIN } from '../../../../../common/constants';
import { SetupGuideLayout, SETUP_GUIDE_TITLE } from '../../../shared/setup_guide';
import { SetWorkplaceSearchChrome as SetPageChrome } from '../../../shared/kibana_chrome';
import { SendWorkplaceSearchTelemetry as SendTelemetry } from '../../../shared/telemetry';

import GettingStarted from './assets/getting_started.png';

import { DOCS_PREFIX } from '../../routes';
const GETTING_STARTED_LINK_URL = `${DOCS_PREFIX}/workplace-search-getting-started.html`;

export const SetupGuide: React.FC = () => {
  return (
    <SetupGuideLayout
      productName={WORKPLACE_SEARCH_PLUGIN.NAME}
      productEuiIcon="logoWorkplaceSearch"
      standardAuthLink="https://www.elastic.co/guide/en/workplace-search/current/workplace-search-security.html#standard"
      elasticsearchNativeAuthLink="https://www.elastic.co/guide/en/workplace-search/current/workplace-search-security.html#elasticsearch-native-realm"
    >
      <SetPageChrome trail={[SETUP_GUIDE_TITLE]} />
      <SendTelemetry action="viewed" metric="setup_guide" />

      <EuiLink href={GETTING_STARTED_LINK_URL} target="_blank">
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
      </EuiLink>

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
