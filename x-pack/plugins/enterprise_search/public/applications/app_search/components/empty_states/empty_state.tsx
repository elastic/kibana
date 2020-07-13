/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useContext } from 'react';
import { EuiPage, EuiPageBody, EuiPageContent, EuiEmptyPrompt, EuiButton } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';

import { sendTelemetry } from '../../../shared/telemetry';
import { SetAppSearchBreadcrumbs as SetBreadcrumbs } from '../../../shared/kibana_breadcrumbs';
import { KibanaContext, IKibanaContext } from '../../../index';

import { EngineOverviewHeader } from '../engine_overview_header';

import './empty_states.scss';

export const EmptyState: React.FC = () => {
  const { enterpriseSearchUrl, http } = useContext(KibanaContext) as IKibanaContext;

  const buttonProps = {
    href: `${enterpriseSearchUrl}/as/engines/new`,
    target: '_blank',
    onClick: () =>
      sendTelemetry({
        http,
        product: 'app_search',
        action: 'clicked',
        metric: 'create_first_engine_button',
      }),
  };

  return (
    <EuiPage restrictWidth>
      <SetBreadcrumbs isRoot />

      <EuiPageBody>
        <EngineOverviewHeader />
        <EuiPageContent className="emptyState">
          <EuiEmptyPrompt
            className="emptyState__prompt"
            iconType="eyeClosed"
            title={
              <h2>
                <FormattedMessage
                  id="xpack.enterpriseSearch.appSearch.emptyState.title"
                  defaultMessage="Create your first engine"
                />
              </h2>
            }
            titleSize="l"
            body={
              <p>
                <FormattedMessage
                  id="xpack.enterpriseSearch.appSearch.emptyState.description1"
                  defaultMessage="An App Search engine stores the documents for your search experience."
                />
              </p>
            }
            actions={
              <EuiButton iconType="popout" fill {...buttonProps}>
                <FormattedMessage
                  id="xpack.enterpriseSearch.appSearch.emptyState.createFirstEngineCta"
                  defaultMessage="Create an engine"
                />
              </EuiButton>
            }
          />
        </EuiPageContent>
      </EuiPageBody>
    </EuiPage>
  );
};
