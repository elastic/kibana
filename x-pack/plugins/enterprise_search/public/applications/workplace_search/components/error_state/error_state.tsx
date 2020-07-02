/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useContext } from 'react';
import { EuiPage, EuiPageBody, EuiPageContent, EuiEmptyPrompt, EuiCode } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';

import { EuiButton } from '../../../shared/react_router_helpers';
import { SetWorkplaceSearchBreadcrumbs as SetBreadcrumbs } from '../../../shared/kibana_breadcrumbs';
import { SendWorkplaceSearchTelemetry as SendTelemetry } from '../../../shared/telemetry';
import { KibanaContext, IKibanaContext } from '../../../index';
import { ViewContentHeader } from '../shared/view_content_header';

export const ErrorState: React.FC = () => {
  const { enterpriseSearchUrl } = useContext(KibanaContext) as IKibanaContext;

  return (
    <EuiPage restrictWidth className="empty-state">
      <SetBreadcrumbs isRoot />
      <SendTelemetry action="error" metric="cannot_connect" />

      <EuiPageBody>
        <ViewContentHeader
          title={i18n.translate('xpack.enterpriseSearch.workplaceSearch.productName', {
            defaultMessage: 'Workplace Search',
          })}
        />
        <EuiPageContent>
          <EuiEmptyPrompt
            iconType="alert"
            iconColor="danger"
            title={
              <h2>
                <FormattedMessage
                  id="xpack.enterpriseSearch.workplaceSearch.errorConnectingState.title"
                  defaultMessage="Cannot connect to Workplace Search"
                />
              </h2>
            }
            titleSize="l"
            body={
              <>
                <p>
                  <FormattedMessage
                    id="xpack.enterpriseSearch.workplaceSearch.errorConnectingState.description1"
                    defaultMessage="We cannot connect to the Workplace Search instance at the configured host URL: {enterpriseSearchUrl}"
                    values={{
                      enterpriseSearchUrl: <EuiCode>{enterpriseSearchUrl}</EuiCode>,
                    }}
                  />
                </p>
                <p>
                  <FormattedMessage
                    id="xpack.enterpriseSearch.workplaceSearch.errorConnectingState.description2"
                    defaultMessage="Please ensure your Workplace Search host URL is configured correctly within {configFile}."
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
                  id="xpack.enterpriseSearch.workplaceSearch.errorConnectingState.setupGuideCta"
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
