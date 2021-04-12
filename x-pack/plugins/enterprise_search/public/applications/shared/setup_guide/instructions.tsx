/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import {
  EuiPageContent,
  EuiSpacer,
  EuiText,
  EuiSteps,
  EuiCode,
  EuiCodeBlock,
  EuiAccordion,
  EuiLink,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';

interface Props {
  productName: string;
  standardAuthLink?: string;
  elasticsearchNativeAuthLink?: string;
}

export const SetupInstructions: React.FC<Props> = ({
  productName,
  standardAuthLink,
  elasticsearchNativeAuthLink,
}) => (
  <EuiPageContent>
    <EuiSteps
      headingElement="h2"
      steps={[
        {
          title: i18n.translate('xpack.enterpriseSearch.setupGuide.step1.title', {
            defaultMessage: 'Add your {productName} host URL to your Kibana configuration',
            values: { productName },
          }),
          children: (
            <EuiText>
              <p>
                <FormattedMessage
                  id="xpack.enterpriseSearch.setupGuide.step1.instruction1"
                  defaultMessage="In your {configFile} file, set {configSetting} to the URL of your {productName} instance. For example:"
                  values={{
                    productName,
                    configFile: <EuiCode>config/kibana.yml</EuiCode>,
                    configSetting: <EuiCode>enterpriseSearch.host</EuiCode>,
                  }}
                />
              </p>
              <EuiCodeBlock language="yml">
                enterpriseSearch.host: &apos;http://localhost:3002&apos;
              </EuiCodeBlock>
            </EuiText>
          ),
        },
        {
          title: i18n.translate('xpack.enterpriseSearch.setupGuide.step2.title', {
            defaultMessage: 'Reload your Kibana instance',
          }),
          children: (
            <EuiText>
              <p>
                <FormattedMessage
                  id="xpack.enterpriseSearch.setupGuide.step2.instruction1"
                  defaultMessage="Restart Kibana to pick up the configuration changes from the previous step."
                />
              </p>
              <p>
                <FormattedMessage
                  id="xpack.enterpriseSearch.setupGuide.step2.instruction2"
                  defaultMessage="If you’re using {elasticsearchNativeAuthLink} in {productName}, you’re all set. Your users can now access {productName} in Kibana with their current {productName} access and permissions."
                  values={{
                    productName,
                    elasticsearchNativeAuthLink: elasticsearchNativeAuthLink ? (
                      <EuiLink href={elasticsearchNativeAuthLink} target="_blank">
                        Elasticsearch Native Auth
                      </EuiLink>
                    ) : (
                      'Elasticsearch Native Auth'
                    ),
                  }}
                />
              </p>
            </EuiText>
          ),
        },
        {
          title: i18n.translate('xpack.enterpriseSearch.setupGuide.step3.title', {
            defaultMessage: 'Troubleshooting issues',
          }),
          children: (
            <>
              <EuiAccordion
                buttonContent={i18n.translate(
                  'xpack.enterpriseSearch.troubleshooting.differentEsClusters.title',
                  {
                    defaultMessage:
                      '{productName} and Kibana are on different Elasticsearch clusters',
                    values: { productName },
                  }
                )}
                id="differentEsClusters"
                paddingSize="s"
              >
                <EuiText>
                  <p>
                    <FormattedMessage
                      id="xpack.enterpriseSearch.troubleshooting.differentEsClusters.description"
                      defaultMessage="This plugin does not currently support {productName} and Kibana running on different clusters."
                      values={{ productName }}
                    />
                  </p>
                </EuiText>
              </EuiAccordion>
              <EuiSpacer />
              <EuiAccordion
                buttonContent={i18n.translate(
                  'xpack.enterpriseSearch.troubleshooting.differentAuth.title',
                  {
                    defaultMessage:
                      '{productName} and Kibana are on different authentication methods',
                    values: { productName },
                  }
                )}
                id="differentAuth"
                paddingSize="s"
              >
                <EuiText>
                  <p>
                    <FormattedMessage
                      id="xpack.enterpriseSearch.troubleshooting.differentAuth.description"
                      defaultMessage="This plugin does not currently support {productName} and Kibana operating on different authentication methods, for example, {productName} using a different SAML provider than Kibana."
                      values={{ productName }}
                    />
                  </p>
                </EuiText>
              </EuiAccordion>
              <EuiSpacer />
              <EuiAccordion
                buttonContent={i18n.translate(
                  'xpack.enterpriseSearch.troubleshooting.standardAuth.title',
                  {
                    defaultMessage: '{productName} on Standard authentication is not supported',
                    values: { productName },
                  }
                )}
                id="standardAuth"
                paddingSize="s"
              >
                <EuiText>
                  <p>
                    <FormattedMessage
                      id="xpack.enterpriseSearch.troubleshooting.standardAuth.description"
                      defaultMessage="This plugin does not fully support {productName} on {standardAuthLink}. Users created in {productName} must have Kibana access. Users created in Kibana will not see {productName} in the navigation menu."
                      values={{
                        productName,
                        standardAuthLink: standardAuthLink ? (
                          <EuiLink href={standardAuthLink} target="_blank">
                            Standard Auth
                          </EuiLink>
                        ) : (
                          'Standard Auth'
                        ),
                      }}
                    />
                  </p>
                </EuiText>
              </EuiAccordion>
            </>
          ),
        },
      ]}
    />
  </EuiPageContent>
);
