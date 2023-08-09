/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { useValues } from 'kea';

import { EuiFlexGroup, EuiFlexItem, EuiSpacer, EuiTitle } from '@elastic/eui';
import { Chat } from '@kbn/cloud-chat-plugin/public';
import { i18n } from '@kbn/i18n';

import { AddContentEmptyPrompt } from '../../../shared/add_content_empty_prompt';
import { ErrorStateCallout } from '../../../shared/error_state';
import { HttpLogic } from '../../../shared/http';
import { KibanaLogic } from '../../../shared/kibana';
import { SetSearchChrome as SetPageChrome } from '../../../shared/kibana_chrome';
import { SendEnterpriseSearchTelemetry as SendTelemetry } from '../../../shared/telemetry';

import { EnterpriseSearchOverviewPageTemplate } from '../layout';
import { SetupGuideCta } from '../setup_guide';
import { TrialCallout } from '../trial_callout';

import { BehavioralAnalyticsProductCard } from './behavioral_analytics_product_card';
import { ElasticsearchProductCard } from './elasticsearch_product_card';
import { SearchApplicationsProductCard } from './search_applications_product_card';

export const ProductSelector: React.FC = () => {
  const { config } = useValues(KibanaLogic);
  const { errorConnectingMessage } = useValues(HttpLogic);

  const showErrorConnecting = !!(config.host && errorConnectingMessage);
  // The create index flow does not work without ent-search, when content is updated
  // to no longer rely on ent-search we can always show the Add Content component
  const showAddContent = config.host && !errorConnectingMessage;

  return (
    <EnterpriseSearchOverviewPageTemplate
      restrictWidth
      pageHeader={{
        pageTitle: i18n.translate('xpack.enterpriseSearch.overview.pageTitle', {
          defaultMessage: 'Welcome to Search',
        }),
      }}
    >
      <SetPageChrome />
      <SendTelemetry action="viewed" metric="overview" />
      <TrialCallout />
      {showAddContent && (
        <>
          <AddContentEmptyPrompt
            title={i18n.translate('xpack.enterpriseSearch.overview.emptyPromptTitle', {
              defaultMessage: 'Add data and start searching',
            })}
            buttonLabel={i18n.translate('xpack.enterpriseSearch.overview.emptyPromptButtonLabel', {
              defaultMessage: 'Create an Elasticsearch index',
            })}
          />
          <EuiSpacer size="l" />
        </>
      )}
      {showErrorConnecting && (
        <>
          <SendTelemetry action="error" metric="cannot_connect" />
          <ErrorStateCallout />
        </>
      )}
      <EuiTitle>
        <h3>
          {i18n.translate('xpack.enterpriseSearch.overview.productSelector.title', {
            defaultMessage: "What's next?",
          })}
        </h3>
      </EuiTitle>
      <EuiSpacer size="xl" />
      <EuiFlexGroup direction="column">
        <EuiFlexItem>
          <ElasticsearchProductCard />
        </EuiFlexItem>
        <EuiFlexItem>
          <SearchApplicationsProductCard />
        </EuiFlexItem>
        <EuiFlexItem>
          <BehavioralAnalyticsProductCard />
        </EuiFlexItem>
        {!config.host && config.canDeployEntSearch && (
          <EuiFlexItem>
            <SetupGuideCta />
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
      <Chat />
    </EnterpriseSearchOverviewPageTemplate>
  );
};
