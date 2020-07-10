/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useContext } from 'react';
import { EuiEmptyPrompt, EuiCode } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';

import { EuiButton } from '../react_router_helpers';
import { KibanaContext, IKibanaContext } from '../../index';

export const ErrorStatePrompt: React.FC = () => {
  const { enterpriseSearchUrl } = useContext(KibanaContext) as IKibanaContext;

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
                enterpriseSearchUrl: <EuiCode>{enterpriseSearchUrl}</EuiCode>,
              }}
            />
          </p>
          <ol className="eui-textLeft">
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
        <EuiButton iconType="help" fill to="/setup_guide">
          <FormattedMessage
            id="xpack.enterpriseSearch.errorConnectingState.setupGuideCta"
            defaultMessage="Review setup guide"
          />
        </EuiButton>
      }
    />
  );
};
