/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useContext } from 'react';
import { EuiPage, EuiPageBody, EuiPageContent, EuiEmptyPrompt, EuiCode } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';

import { EuiButton } from '../../../shared/react_router_helpers';
import { SetAppSearchBreadcrumbs as SetBreadcrumbs } from '../../../shared/kibana_breadcrumbs';
import { SendAppSearchTelemetry as SendTelemetry } from '../../../shared/telemetry';
import { KibanaContext, IKibanaContext } from '../../../index';
import { EngineOverviewHeader } from '../engine_overview_header';

import './empty_states.scss';

export const ErrorState: React.FC = () => {
  const { enterpriseSearchUrl } = useContext(KibanaContext) as IKibanaContext;

  return (
    <EuiPage restrictWidth>
      <SetBreadcrumbs isRoot />
      <SendTelemetry action="error" metric="cannot_connect" />

      <EuiPageBody>
        <EngineOverviewHeader isButtonDisabled />
        <EuiPageContent className="emptyState">
          <EuiEmptyPrompt
            className="emptyState__prompt"
            iconType="alert"
            iconColor="danger"
            title={
              <h2>
                <FormattedMessage
                  id="xpack.enterpriseSearch.appSearch.errorConnectingState.title"
                  defaultMessage="Cannot connect to App Search"
                />
              </h2>
            }
            titleSize="l"
            body={
              <>
                <p>
                  <FormattedMessage
                    id="xpack.enterpriseSearch.appSearch.errorConnectingState.description1"
                    defaultMessage="We cannot connect to the App Search instance at the configured host URL: {enterpriseSearchUrl}"
                    values={{
                      enterpriseSearchUrl: <EuiCode>{enterpriseSearchUrl}</EuiCode>,
                    }}
                  />
                </p>
                <p>
                  <FormattedMessage
                    id="xpack.enterpriseSearch.appSearch.errorConnectingState.description2"
                    defaultMessage="Please ensure your App Search host URL is configured correctly within {configFile}."
                    values={{
                      configFile: <EuiCode>config/kibana.yml</EuiCode>,
                    }}
                  />
                </p>
              </>
            }
            actions={
              <EuiButton iconType="help" fill to="/setup_guide">
                <FormattedMessage
                  id="xpack.enterpriseSearch.appSearch.errorConnectingState.setupGuideCta"
                  defaultMessage="Review the setup guide"
                />
              </EuiButton>
            }
          />
        </EuiPageContent>
      </EuiPageBody>
    </EuiPage>
  );
};
