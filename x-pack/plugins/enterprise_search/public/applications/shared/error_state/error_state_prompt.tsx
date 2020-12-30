/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { useValues } from 'kea';
import { EuiEmptyPrompt, EuiCode } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';

import { EuiButtonTo } from '../react_router_helpers';
import { KibanaLogic } from '../../shared/kibana';

import './error_state_prompt.scss';

export const ErrorStatePrompt: React.FC = () => {
  const { config } = useValues(KibanaLogic);

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
              defaultMessage="We can’t establish a connection to Enterprise Search at the host URL: {enterpriseSearchUrl}"
              values={{
                enterpriseSearchUrl: <EuiCode>{config.host}</EuiCode>,
              }}
            />
          </p>
          <ol className="troubleshootingSteps">
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
                    defaultMessage="You must authenticate using Elasticsearch Native auth or SSO/SAML."
                  />
                </li>
                <li>
                  <FormattedMessage
                    id="xpack.enterpriseSearch.errorConnectingState.troubleshootAuthSAML"
                    defaultMessage="If using SSO/SAML, your SAML realm must also be set up on Enterprise Search."
                  />
                </li>
              </ul>
            </li>
            <li>
              <FormattedMessage
                id="xpack.enterpriseSearch.errorConnectingState.description4"
                defaultMessage="Review the Setup guide or check your server log for {pluginLog} log messages."
                values={{
                  pluginLog: <EuiCode>[enterpriseSearch][plugins]</EuiCode>,
                }}
              />
            </li>
          </ol>
        </>
      }
      actions={
        <EuiButtonTo iconType="help" fill to="/setup_guide">
          <FormattedMessage
            id="xpack.enterpriseSearch.errorConnectingState.setupGuideCta"
            defaultMessage="Review setup guide"
          />
        </EuiButtonTo>
      }
    />
  );
};
