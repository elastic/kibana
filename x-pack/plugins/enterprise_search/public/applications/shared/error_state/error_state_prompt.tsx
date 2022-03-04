/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';

import { useValues } from 'kea';

import { EuiEmptyPrompt, EuiCode, EuiLink, EuiCodeBlock } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

import { CloudSetup } from '../../../../../cloud/public';

import { HttpLogic } from '../http';
import { KibanaLogic } from '../kibana';
import { EuiButtonTo, EuiLinkTo } from '../react_router_helpers';

import './error_state_prompt.scss';

/**
 * Personal dashboard urls begin with /p/
 * EX: http://localhost:5601/app/enterprise_search/workplace_search/p/sources
 */
const WORKPLACE_SEARCH_PERSONAL_DASHBOARD_PATH = '/p/';

export const ErrorStatePrompt: React.FC = () => {
  const { errorConnectingMessage } = useValues(HttpLogic);
  const { config, cloud, setChromeIsVisible, history } = useValues(KibanaLogic);
  const isCloudEnabled = cloud.isCloudEnabled;
  const isWorkplaceSearchPersonalDashboardRoute = history.location.pathname.includes(
    WORKPLACE_SEARCH_PERSONAL_DASHBOARD_PATH
  );

  useEffect(() => {
    // We hide the Kibana chrome for Workplace Search for Personal Dashboard routes. It is reenabled when the user enters the
    // Workplace Search organization admin section of the product. If the Enterprise Search API is not working, we never show
    // the chrome and this can have adverse effects when the user leaves thispage and returns to Kibana. To get around this,
    // we always show the chrome when the error state is shown, unless the user is visiting the Personal Dashboard.
    setChromeIsVisible(!isWorkplaceSearchPersonalDashboardRoute);
  }, []);

  return (
    <EuiEmptyPrompt
      iconType="alert"
      iconColor="danger"
      title={
        <h2>
          <FormattedMessage
            id="xpack.enterpriseSearch.errorConnectingState.title"
            defaultMessage="Unable to connect"
          />
        </h2>
      }
      titleSize="l"
      body={
        <>
          <p>
            <FormattedMessage
              id="xpack.enterpriseSearch.errorConnectingState.description1"
              defaultMessage="We can’t establish a connection to Enterprise Search at the host URL {enterpriseSearchUrl} due to the following error:"
              values={{
                enterpriseSearchUrl: (
                  <EuiLink target="_blank" href={config.host} css={{ overflowWrap: 'break-word' }}>
                    {config.host}
                  </EuiLink>
                ),
              }}
            />
          </p>
          <EuiCodeBlock css={{ textAlign: 'left' }}>{errorConnectingMessage}</EuiCodeBlock>
          {isCloudEnabled ? cloudError(cloud) : nonCloudError()}
        </>
      }
      actions={[
        <EuiButtonTo iconType="help" fill to="/setup_guide">
          <FormattedMessage
            id="xpack.enterpriseSearch.errorConnectingState.setupGuideCta"
            defaultMessage="Review setup guide"
          />
        </EuiButtonTo>,
      ]}
    />
  );
};

const cloudError = (cloud: Partial<CloudSetup>) => {
  const deploymentUrl = cloud?.deploymentUrl;
  return (
    <p data-test-subj="CloudError">
      <FormattedMessage
        id="xpack.enterpriseSearch.errorConnectingState.cloudErrorMessage"
        defaultMessage="Does your Cloud deployment have Enterprise Search nodes running? {deploymentSettingsLink}"
        values={{
          deploymentSettingsLink: (
            <EuiLinkTo target="_blank" to={`${deploymentUrl}/edit`}>
              {i18n.translate(
                'xpack.enterpriseSearch.errorConnectingState.cloudErrorMessageLinkText',
                {
                  defaultMessage: 'Check your deployment settings',
                }
              )}
            </EuiLinkTo>
          ),
        }}
      />
    </p>
  );
};

const nonCloudError = () => {
  return (
    <ol className="troubleshootingSteps" data-test-subj="SelfManagedError">
      <li>
        <FormattedMessage
          id="xpack.enterpriseSearch.errorConnectingState.description2"
          defaultMessage="Ensure the host URL is configured correctly in {configFile}."
          values={{
            configFile: <EuiCode>config/kibana.yml</EuiCode>,
          }}
        />
      </li>
      <li>
        <FormattedMessage
          id="xpack.enterpriseSearch.errorConnectingState.description3"
          defaultMessage="Confirm that the Enterprise Search server is responsive."
        />
      </li>
      <li>
        <FormattedMessage
          id="xpack.enterpriseSearch.errorConnectingState.troubleshootAuth"
          defaultMessage="Check your user authentication:"
        />
        <ul>
          <li>
            <FormattedMessage
              id="xpack.enterpriseSearch.errorConnectingState.troubleshootAuthNative"
              defaultMessage="You must authenticate using Elasticsearch Native auth, SSO/SAML, or OpenID Connect."
            />
          </li>
          <li>
            <FormattedMessage
              id="xpack.enterpriseSearch.errorConnectingState.troubleshootAuthSAML"
              defaultMessage="If using an external SSO provider, such as SAML or OpenID Connect, your SAML/OIDC realm must also be set up on Enterprise Search."
            />
          </li>
        </ul>
      </li>
    </ol>
  );
};
