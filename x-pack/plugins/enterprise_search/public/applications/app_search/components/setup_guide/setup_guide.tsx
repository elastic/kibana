/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { EuiSpacer, EuiTitle, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

import { APP_SEARCH_PLUGIN } from '../../../../../common/constants';
import { SetAppSearchChrome as SetPageChrome } from '../../../shared/kibana_chrome';
import { SetupGuideLayout, SETUP_GUIDE_TITLE } from '../../../shared/setup_guide';
import { SendAppSearchTelemetry as SendTelemetry } from '../../../shared/telemetry';

import GettingStarted from './assets/getting_started.png';

export const SetupGuide: React.FC = () => (
  <SetupGuideLayout productName={APP_SEARCH_PLUGIN.NAME} productEuiIcon="logoAppSearch">
    <SetPageChrome trail={[SETUP_GUIDE_TITLE]} />
    <SendTelemetry action="viewed" metric="setup_guide" />

    <a
      href="https://www.elastic.co/webinars/getting-started-with-elastic-app-search"
      target="_blank"
      rel="noopener noreferrer"
    >
      <img
        className="setupGuide__thumbnail"
        src={GettingStarted}
        alt={i18n.translate('xpack.enterpriseSearch.appSearch.setupGuide.videoAlt', {
          defaultMessage:
            "Getting started with App Search - in this short video we'll guide you through how to get App Search up and running",
        })}
        width="1280"
        height-="720"
      />
    </a>

    <EuiTitle size="s">
      <p>
        <FormattedMessage
          id="xpack.enterpriseSearch.appSearch.setupGuide.description"
          defaultMessage="Get tools to design and deploy a powerful search to your websites and mobile applications."
        />
      </p>
    </EuiTitle>
    <EuiSpacer size="m" />
    <EuiText>
      <p>
        <FormattedMessage
          id="xpack.enterpriseSearch.appSearch.setupGuide.notConfigured"
          defaultMessage="App Search is not configured in your Kibana instance yet."
        />
      </p>
    </EuiText>
  </SetupGuideLayout>
);
